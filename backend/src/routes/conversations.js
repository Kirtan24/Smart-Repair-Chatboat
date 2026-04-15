const express = require('express');
const { authenticate } = require('../middleware/auth');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const router = express.Router();

// All routes require auth
router.use(authenticate);

// -- List conversations -----------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.aggregate([
      { $match: { user_id: req.user._id } },
      {
        $lookup: {
          from: 'messages',
          localField: '_id',
          foreignField: 'conversation_id',
          as: 'messages',
        },
      },
      {
        $addFields: {
          message_count: { $size: '$messages' },
          last_message: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$messages',
                  cond: { $ne: ['$$this.role', 'system'] },
                },
              },
              -1,
            ],
          },
        },
      },
      { $sort: { updated_at: -1 } },
      { $limit: 50 },
      {
        $project: {
          _id: 1,
          title: 1,
          issue_type: 1,
          status: 1,
          resolution_status: 1,
          created_at: 1,
          updated_at: 1,
          message_count: 1,
          last_message: { content: 1, created_at: 1 },
        },
      },
    ]);

    res.json({ conversations });
  } catch (err) {
    console.error('[ERROR] Failed to fetch conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// -- Create conversation ----------------------------------------------------
router.post('/', async (req, res) => {
  const { title, issue_type } = req.body;

  try {
    const conversation = new Conversation({
      user_id: req.user._id,
      title: title || 'New Conversation',
      issue_type: issue_type || 'general',
    });

    await conversation.save();
    res.status(201).json({ conversation });
  } catch (err) {
    console.error('[ERROR] Failed to create conversation:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// -- Get single conversation with messages ---------------------------------
router.get('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || conversation.user_id !== req.user._id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({
      conversation_id: req.params.id,
      is_latest: true,
    }).sort({ created_at: 1 });

    res.json({ conversation, messages });
  } catch (err) {
    console.error('[ERROR] Failed to fetch conversation:', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// -- Update conversation (title, status) -----------------------------------
router.patch('/:id', async (req, res) => {
  const { title, resolution_status, issue_type } = req.body;

  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || conversation.user_id !== req.user._id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (title) conversation.title = title;
    if (resolution_status) conversation.resolution_status = resolution_status;
    if (issue_type) conversation.issue_type = issue_type;

    await conversation.save();
    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to update conversation:', err);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// -- Delete conversation ----------------------------------------------------
router.delete('/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation || conversation.user_id !== req.user._id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Delete all messages in the conversation
    await Message.deleteMany({ conversation_id: req.params.id });

    // Delete the conversation
    await Conversation.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[ERROR] Failed to delete conversation:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// -- Edit a message (versioned) ---------------------------------------------
router.patch('/:convId/messages/:msgId', async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  try {
    // Verify conversation ownership and user can edit message
    const conversation = await Conversation.findById(req.params.convId);
    if (!conversation || conversation.user_id !== req.user._id) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = await Message.findById(req.params.msgId);
    if (!message || message.conversation_id !== req.params.convId || message.role !== 'user') {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Save old version by creating a copy
    const oldVersion = new Message({
      conversation_id: message.conversation_id,
      role: message.role,
      content: message.content,
      input_type: message.input_type,
      image_url: message.image_url,
      audio_url: message.audio_url,
      metadata: message.metadata,
      parent_id: req.params.msgId,
      version: message.version,
      is_latest: false,
    });
    await oldVersion.save();

    // Update the message
    message.content = content.trim();
    message.version = (message.version || 1) + 1;
    message.is_latest = true;
    await message.save();

    res.json({ success: true, version: message.version });
  } catch (err) {
    console.error('[ERROR] Failed to edit message:', err);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// -- Get message version history --------------------------------------------
router.get('/:convId/messages/:msgId/versions', async (req, res) => {
  try {
    const versions = await Message.find({
      parent_id: req.params.msgId,
      is_latest: false,
    }).sort({ version: 1 });

    res.json({ versions });
  } catch (err) {
    console.error('[ERROR] Failed to fetch versions:', err);
    res.status(500).json({ error: 'Failed to fetch versions' });
  }
});

module.exports = router;
