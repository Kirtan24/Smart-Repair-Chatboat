const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const { authenticate } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { detectIssueType, getDecisionTree, assessComplexity } = require('../services/decisionTree');
const { generateAIResponse, buildSystemPrompt, analyzeImage, transcribeAudio } = require('../services/aiService');
const { searchNearbyTechnicians } = require('../services/technicianService');

const router = express.Router();

// ── Multer config ─────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|mp3|mp4|wav|m4a|ogg|webm/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    cb(null, allowed.test(ext));
  },
});

// All routes require auth
router.use(authenticate);

// ── Send a message ─────────────────────────────────────────────────────────
router.post(
  '/send',
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
  async (req, res) => {
    const {
      conversation_id,
      content,
      input_type = 'text',
      location,
    } = req.body;

    if (!content?.trim() && !req.files?.image && !req.files?.audio) {
      return res.status(400).json({ error: 'Message content, image, or audio is required' });
    }

    try {
      let finalContent = content?.trim() || '';
      let imageUrl = null;
      let imageAnalysis = null;

      // ── Handle image upload ──────────────────────────────────────────────
      if (req.files?.image) {
        const imgFile = req.files.image[0];
        imageUrl = `/uploads/${imgFile.filename}`;
        try {
          imageAnalysis = await analyzeImage(imgFile.path);
        } catch (e) {
          console.warn('Image analysis skipped:', e.message);
        }
      }

      // ── Handle audio upload (transcribe with Whisper) ─────────────────
      if (req.files?.audio) {
        const audioFile = req.files.audio[0];
        try {
          const transcript = await transcribeAudio(audioFile.path);
          finalContent = transcript.text;
          fs.unlinkSync(audioFile.path); // clean up
        } catch (e) {
          return res.status(400).json({ error: e.message });
        }
      }

      if (!finalContent && !imageUrl) {
        return res.status(400).json({ error: 'Could not process input' });
      }

      // ── Resolve or create conversation ────────────────────────────────
      let convId = conversation_id;
      let conv = null;

      if (convId) {
        conv = await Conversation.findById(convId);
        if (!conv || conv.user_id !== req.user._id) {
          return res.status(404).json({ error: 'Conversation not found' });
        }
      } else {
        convId = uuidv4();
        const detectedType = imageAnalysis?.issueType || detectIssueType(finalContent);
        const title = buildTitle(finalContent, detectedType);
        conv = new Conversation({
          _id: convId,
          user_id: req.user._id,
          title: title,
          issue_type: detectedType || 'general',
        });
        await conv.save();
      }

      // ── Detect / update issue type ────────────────────────────────────
      const detectedType = imageAnalysis?.issueType || detectIssueType(finalContent) || conv.issue_type;
      if (detectedType && detectedType !== conv.issue_type) {
        conv.issue_type = detectedType;
        await conv.save();
      }

      // ── Save user message ─────────────────────────────────────────────
      const userMsgId = uuidv4();
      const combinedContent = imageAnalysis
        ? `${finalContent}\n\n[Image Analysis: ${imageAnalysis.observations}]`
        : finalContent;

      const userMessage = new Message({
        _id: userMsgId,
        conversation_id: convId,
        role: 'user',
        content: finalContent || '[Image uploaded]',
        input_type: input_type,
        image_url: imageUrl,
        metadata: { imageAnalysis },
      });
      await userMessage.save();

      // ── Build conversation history for AI ─────────────────────────────
      const history = await Message.find({
        conversation_id: convId,
        is_latest: true,
        role: { $ne: 'system' },
      }).sort({ created_at: 1 }).limit(20);

      const aiMessages = history.map((m) => ({ role: m.role, content: m.content }));
      // Replace last user message with full combined content
      if (aiMessages.length > 0 && aiMessages[aiMessages.length - 1].role === 'user') {
        aiMessages[aiMessages.length - 1].content = combinedContent;
      }

      // ── Run decision tree check ───────────────────────────────────────
      const decisionTree = getDecisionTree(conv.issue_type);
      const context = {
        issueType: conv.issue_type,
        imageAnalysis,
        decisionTree: decisionTree?.name,
      };

      // ── Generate AI response ──────────────────────────────────────────
      const systemPrompt = buildSystemPrompt(context);
      const aiResult = await generateAIResponse(aiMessages, systemPrompt, context);

      // ── Check if professional technician needed ───────────────────────
      const needsPro = checkIfNeedsProfessional(aiResult.content, finalContent);
      let technicians = [];
      if (needsPro) {
        const loc = location ? JSON.parse(location) : null;
        technicians = await searchNearbyTechnicians(loc, conv.issue_type, 3);
      }

      // ── Save assistant message ────────────────────────────────────────
      const asstMsgId = uuidv4();
      const assistantMessage = new Message({
        _id: asstMsgId,
        conversation_id: convId,
        role: 'assistant',
        content: aiResult.content,
        metadata: { provider: aiResult.provider, technicians, needsPro },
      });
      await assistantMessage.save();

      // ── Update conversation timestamp ─────────────────────────────────
      conv.updated_at = Date.now();
      await conv.save();

      res.json({
        conversation_id: convId,
        user_message: {
          id: userMsgId,
          role: 'user',
          content: finalContent || '[Image uploaded]',
          image_url: imageUrl,
          input_type,
          created_at: new Date().toISOString(),
        },
        assistant_message: {
          id: asstMsgId,
          role: 'assistant',
          content: aiResult.content,
          metadata: { provider: aiResult.provider, technicians, needsPro },
          created_at: new Date().toISOString(),
        },
        issue_type: conv.issue_type,
      });
    } catch (err) {
      console.error('[ERROR] Chat send error:', err);
      res.status(500).json({ error: err.message || 'Failed to process message' });
    }
  }
);

// ── Regenerate last assistant response ────────────────────────────────────
router.post('/regenerate', async (req, res) => {
  const { conversation_id } = req.body;
  if (!conversation_id) return res.status(400).json({ error: 'conversation_id required' });

  try {
    const conv = await Conversation.findById(conversation_id);
    if (!conv || conv.user_id !== req.user._id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Remove last assistant message
    const lastAsst = await Message.findOne({
      conversation_id: conversation_id,
      role: 'assistant',
    }).sort({ created_at: -1 });
    
    if (lastAsst) {
      await Message.findByIdAndDelete(lastAsst._id);
    }

    const history = await Message.find({
      conversation_id: conversation_id,
      is_latest: true,
      role: { $ne: 'system' },
    }).sort({ created_at: 1 }).limit(20);

    const context = { issueType: conv.issue_type };
    const systemPrompt = buildSystemPrompt(context);
    const aiResult = await generateAIResponse(
      history.map((m) => ({ role: m.role, content: m.content })),
      systemPrompt,
      context
    );

    const needsPro = checkIfNeedsProfessional(aiResult.content, '');
    let technicians = [];
    if (needsPro) {
      technicians = await searchNearbyTechnicians(null, conv.issue_type, 3);
    }

    const asstMsgId = uuidv4();
    const assistantMessage = new Message({
      _id: asstMsgId,
      conversation_id: conversation_id,
      role: 'assistant',
      content: aiResult.content,
      metadata: { provider: aiResult.provider, technicians, needsPro, regenerated: true },
    });
    await assistantMessage.save();

    res.json({
      message: {
        _id: asstMsgId,
        role: 'assistant',
        content: aiResult.content,
        metadata: { provider: aiResult.provider, technicians, needsPro },
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[ERROR] Regenerate error:', err);
    res.status(500).json({ error: 'Failed to regenerate response' });
  }
});

// ── Search technicians ─────────────────────────────────────────────────────
router.post('/technicians', async (req, res) => {
  const { issue_type, location } = req.body;
  try {
    const technicians = await searchNearbyTechnicians(location, issue_type || 'general', 5);
    res.json({ technicians });
  } catch (err) {
    res.status(500).json({ error: 'Failed to search technicians' });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────
function buildTitle(content, issueType) {
  if (content && content.length > 5) {
    return content.slice(0, 60) + (content.length > 60 ? '…' : '');
  }
  const labels = {
    ac: 'AC Troubleshooting', refrigerator: 'Fridge Issue',
    wifi: 'WiFi Problem', fan: 'Fan Repair',
    washing_machine: 'Washing Machine', general: 'Appliance Issue',
  };
  return labels[issueType] || 'New Repair Request';
}

function checkIfNeedsProfessional(aiResponse, userMessage) {
  const proKeywords = [
    'professional', 'technician', 'certified', 'call a', 'hire a',
    'expert help', 'service center', 'warranty', 'refrigerant',
    'compressor', 'cannot be fixed', 'serious fault', 'electrical fault',
    'recommend a technician', 'needs professional',
  ];
  const combined = (aiResponse + ' ' + userMessage).toLowerCase();
  return proKeywords.some((kw) => combined.includes(kw));
}

module.exports = router;
