const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const fs = require('fs');

// Lazy initialization — created on first use so .env is guaranteed loaded
let _genAI = null;
function getGenAI() {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return _genAI;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CHAT_MODEL = 'gemini-2.5-flash';
const VISION_MODEL = 'gemini-2.5-flash';

/**
 * Analyze uploaded image using Gemini Vision to detect appliance issues
 */
async function analyzeImage(imagePath) {
  try {
    const model = getGenAI().getGenerativeModel({ model: VISION_MODEL });

    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    const prompt = `You are an expert home appliance repair technician. Analyze this image and provide:
1. What appliance or item is shown
2. What visible problems or issues you can detect (water stains, damage, wear, etc.)
3. The likely severity (low/medium/high)
4. Initial observations that would help diagnose the problem

Be specific and technical. Format as JSON:
{
  "appliance": "name of appliance",
  "issueType": "ac|refrigerator|wifi|fan|washing_machine|water_heater|tv|microwave|general",
  "visibleIssues": ["issue 1", "issue 2"],
  "severity": "low|medium|high",
  "observations": "detailed technical observations",
  "confidence": 0.0-1.0
}`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType,
        },
      },
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { appliance: 'unknown', issueType: 'general', visibleIssues: [], severity: 'medium', observations: text, confidence: 0.5 };
  } catch (error) {
    console.error('Image analysis error:', error);
    return { appliance: 'unknown', issueType: 'general', visibleIssues: [], severity: 'medium', observations: 'Unable to analyze image', confidence: 0 };
  }
}

/**
 * Generate AI response using Gemini 2.0 Flash with Google Search grounding
 */
async function generateAIResponse(messages, systemPrompt, context = {}) {
  console.log(`[AI] Using ${CHAT_MODEL} with Google Search grounding`);
  console.log('[AI] Gemini API Key present:', !!process.env.GEMINI_API_KEY);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured. Please add it to your .env file.');
  }

  return await generateWithGemini(messages, systemPrompt, context);
}

async function generateWithGemini(messages, systemPrompt, context) {
  try {
    console.log(`[Gemini] Initializing ${CHAT_MODEL}...`);

    const model = getGenAI().getGenerativeModel({
      model: CHAT_MODEL,
      tools: [
        {
          googleSearch: {},
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      systemInstruction: systemPrompt,
    });

    // Convert messages to Gemini format (all but the last)
    const history = messages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    console.log('[Gemini] Starting chat with', messages.length, 'messages');
    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1];

    console.log('[Gemini] Sending message:', lastMessage.content.substring(0, 100) + '...');
    const result = await chat.sendMessage(lastMessage.content);

    const response = result.response;
    const text = response.text();

    // Log if grounding was used
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.webSearchQueries?.length) {
      console.log('[Gemini] Search grounding used. Queries:', groundingMetadata.webSearchQueries);
    }

    console.log(`[Gemini] ✓ Response received (${text.length} chars)`);
    return {
      content: text,
      provider: 'gemini',
      model: CHAT_MODEL,
      searchUsed: !!groundingMetadata?.webSearchQueries?.length,
    };
  } catch (error) {
    const causeMsg = error.cause?.message || String(error.cause || '');
    console.error('[Gemini ERROR]:', {
      name: error.name,
      message: error.message,
      cause: causeMsg,
      status: error.status,
    });

    const errMsg = error.message || '';

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('400 Bad Request')) {
      throw new Error('GEMINI API KEY IS INVALID - Get a valid key from https://aistudio.google.com/app/apikey. Detail: ' + errMsg);
    } else if (errMsg.includes('API key')) {
      throw new Error('GEMINI API KEY ERROR - Check .env file. Detail: ' + errMsg);
    } else if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
      throw new Error('GEMINI API KEY PERMISSION DENIED - Key may not have Generative Language API enabled. Detail: ' + errMsg);
    } else if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('429')) {
      throw new Error('GEMINI QUOTA EXCEEDED - Daily/minute limit reached. Try again later.');
    } else if (errMsg.includes('network') || errMsg.includes('fetch') || causeMsg.includes('ENOTFOUND') || causeMsg.includes('ECONNREFUSED')) {
      throw new Error('NETWORK ERROR connecting to Gemini - ' + (causeMsg || errMsg));
    }

    throw new Error('Gemini API Error: ' + errMsg);
  }
}

/**
 * Build the system prompt for the repair assistant
 */
function buildSystemPrompt(context = {}) {
  const { issueType, currentStep, diagnosis, imageAnalysis } = context;

  let basePrompt = `You are Smart Repair Assistant, a professional home appliance technician with 20+ years of experience. Your job is to diagnose problems and give step-by-step repair solutions immediately — not to interview the user endlessly.

TONE RULES (strictly follow these):
- Use neutral, professional language at all times
- Never use slang, casual phrases, or Gen-Z expressions
- Do not open with filler phrases like "Great question!" or "I understand your frustration"
- Be direct and solution-focused

CORE DIAGNOSTIC RULES:
1. **Diagnose first, ask later.** Based on what the user described, immediately state the most likely cause(s) and provide repair steps. Do not ask questions before attempting a diagnosis.
2. **Ask ONE follow-up question only if** the information is genuinely insufficient to diagnose anything at all (e.g., appliance type is unknown). Otherwise, give a diagnosis.
3. When multiple causes are likely, address the top 2–3 with their fixes.
4. Always provide complete, actionable step-by-step instructions.
5. Include [WARNING] for any safety hazard (electrical, refrigerant, gas).
6. Use Google Search to find accurate repair guides, error codes, or model-specific information when needed.

WHEN TO RECOMMEND A PROFESSIONAL TECHNICIAN:
- Refrigerant / gas leaks (always requires a certified technician)
- Electrical faults, burning smells, tripped breakers
- Compressor failure
- Any repair requiring licensed work or special tools
- When the user has already tried the DIY steps and they failed
→ When any of these apply, explicitly say: "I recommend calling a professional technician for this repair." and list the reason clearly. This triggers a nearby technician search for the user.

RESPONSE FORMAT:
- Use numbered steps for repair instructions
- Use bullet points for lists of possible causes
- Use [WARNING] for safety notices, [TIP] for helpful hints
- Bold key actions using **text**
- Keep each response focused and under 250 words unless step-by-step instructions require more

CURRENT CONTEXT:`;

  if (issueType && issueType !== 'general') {
    basePrompt += `\nDetected appliance: ${issueType.toUpperCase()}`;
  }

  if (imageAnalysis) {
    basePrompt += `\nImage Analysis: ${JSON.stringify(imageAnalysis)}`;
  }

  if (currentStep) {
    basePrompt += `\nCurrent troubleshooting step: ${currentStep}`;
  }

  if (diagnosis) {
    basePrompt += `\nIdentified issue: ${JSON.stringify(diagnosis)}`;
  }

  basePrompt += `

When you have enough information to diagnose:
1. State the likely problem clearly
2. Give step-by-step fix instructions
3. Mention when professional help is needed
4. Always provide a complete solution

If user asks about something unrelated to home repairs, politely redirect them to appliance/home issues.`;

  return basePrompt;
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeAudio(audioPath) {
  try {
    const audioStream = fs.createReadStream(audioPath);

    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'en',
    });

    return {
      text: transcription.text,
      confidence: 0.95,
    };
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio. Please try typing your message.');
  }
}

module.exports = {
  analyzeImage,
  generateAIResponse,
  buildSystemPrompt,
  transcribeAudio,
};
