# Smart Repair Assistant

An AI-powered home appliance troubleshooting chatbot. Describe your appliance problem — via text, voice, or photo — and get an instant diagnosis, step-by-step repair instructions, and real nearby technician contacts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Zustand, React Hot Toast |
| Backend | Node.js, Express, MongoDB Atlas, Mongoose |
| AI | Google Gemini 2.5 Flash (with Google Search grounding) |
| Voice | OpenAI Whisper (transcription) |
| Technicians | Gemini AI search → OpenStreetMap Overpass → Google Places → Demo |

---

## Features

- **Instant diagnosis** — describe your problem and get a diagnosis with repair steps immediately, no endless follow-up questions
- **Google Search grounding** — Gemini searches the web for up-to-date repair guides, error codes, and model-specific info in real time
- **Voice input** — record your issue with echo cancellation and a live audio-reactive animation
- **Image upload** — paste (Ctrl+V), drag & drop, or pick a photo; Gemini Vision analyses it automatically
- **Real nearby technicians** — AI searches Google for actual local repair shops with phone numbers; falls back to OpenStreetMap data (free, no key needed)
- **Conversation memory** — full history is sent to the AI on every message
- **Edit & regenerate** — edit any past message or regenerate the last AI response
- **JWT authentication** — secure login/register

---

## Project Structure

```
Chatboat/
├── backend/                  Node.js / Express API
│   ├── src/
│   │   ├── index.js          Server entry point
│   │   ├── routes/
│   │   │   ├── auth.js       POST /api/auth/register, /login
│   │   │   ├── chat.js       POST /api/chat/send, /regenerate
│   │   │   └── conversations.js  GET /api/conversations
│   │   ├── services/
│   │   │   ├── aiService.js        Gemini 2.5 Flash + Google Search
│   │   │   ├── technicianService.js  AI / OSM / Google Places search
│   │   │   └── decisionTree.js     Appliance issue type detection
│   │   └── models/           Mongoose schemas (User, Conversation, Message)
│   └── .env                  Environment variables (see below)
│
└── frontend/                 Next.js app
    └── src/
        ├── app/
        │   ├── page.tsx       Main chat page
        │   └── login/         Auth page
        ├── components/
        │   ├── ChatInput.tsx      Text / image (paste & drop) / voice input
        │   ├── VoiceRecorder.tsx  Live audio-reactive globe animation
        │   ├── MessageBubble.tsx  Chat messages with Markdown rendering
        │   └── TechnicianCards.tsx  Nearby technician cards
        └── store/
            ├── authStore.ts   User session (Zustand)
            └── chatStore.ts   Conversations & messages (Zustand)
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Google Gemini API key — get one free at [aistudio.google.com](https://aistudio.google.com/app/apikey)

### 1. Clone and install

```bash
# Install all dependencies (root + backend + frontend)
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

**`backend/.env`**
```env
PORT=5000
NODE_ENV=development

JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d

# Required — get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key

# Optional — enables voice transcription
OPENAI_API_KEY=your_openai_api_key

# Optional — adds Google Places as a technician source
# Get from https://console.cloud.google.com → enable "Places API (New)"
GOOGLE_PLACES_API_KEY=your_places_api_key

MONGODB_URI=your_mongodb_atlas_connection_string
FRONTEND_URL=http://localhost:3000
```

**`frontend/.env.local`**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=Smart Repair Assistant
```

### 3. Run

```bash
# From the project root (starts both servers)
start-dev.bat

# Or manually:
cd backend  && npm run dev   # → http://localhost:5000
cd frontend && npm run dev   # → http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/conversations` | List all conversations |
| GET | `/api/conversations/:id` | Get conversation + messages |
| POST | `/api/chat/send` | Send message (text / image / voice) |
| POST | `/api/chat/regenerate` | Regenerate last AI response |

### `POST /api/chat/send`

```
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
  content         string   — text message
  input_type      string   — "text" | "image" | "voice"
  conversation_id string   — existing conversation (omit to start new)
  location        string   — JSON: {"lat": 23.0, "lng": 72.5}
  image           file     — JPEG / PNG / WebP (max 20MB)
  audio           file     — WebM / OGG audio recording
```

---

## Technician Search

Technician results are sourced in this priority order:

1. **Gemini AI + Google Search** — asks Gemini to search Google for real local repair shops; returns name, phone, and address
2. **OpenStreetMap Overpass** — free, no API key, real business data from OSM
3. **Google Places API (New)** — richest data (verified phones, ratings, photos); requires a key
4. **Demo cards** — shown only when location permission is denied

---

## Supported Appliances

AC · Refrigerator · Washing Machine · Ceiling Fan · WiFi/Router · Water Heater · TV · Microwave
