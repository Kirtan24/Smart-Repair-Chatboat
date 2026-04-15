require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const connectDB = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security middleware ────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ──────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: { error: 'Too many requests, slow down' } });
app.use('/api/', limiter);
app.use('/api/chat/', chatLimiter);

// ── Body parsing ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static uploads ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Auto-migrate on startup ────────────────────────────────────────────────
async function initDb() {
  try {
    // Import models to ensure they are registered
    require('./models/User');
    require('./models/Conversation');
    require('./models/Message');
    require('./models/Technician');
    
    console.log('[OK] Database models initialized');
  } catch (error) {
    console.error('[ERROR] Failed to initialize models:', error.message);
    throw error;
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/chat', require('./routes/chat'));

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize database models
    await initDb();
    
    // Start the server
    app.listen(PORT, () => {
      console.log('[OK] Smart Repair Assistant API running on port ' + PORT);
      console.log('[INFO] Health: http://localhost:' + PORT + '/api/health');
    });
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error.message);
    process.exit(1);
  }
}

start();

module.exports = app;
