require('dotenv').config();
const { run, getDb } = require('./connection');

async function migrate() {
  console.log('🔄 Running database migrations...');

  // Users table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT,
      avatar_url TEXT,
      provider TEXT DEFAULT 'email',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Conversations table
  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      user_id TEXT NOT NULL,
      title TEXT,
      issue_type TEXT,
      status TEXT DEFAULT 'active',
      resolution_status TEXT DEFAULT 'in_progress',
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Messages table
  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      input_type TEXT DEFAULT 'text',
      image_url TEXT,
      audio_url TEXT,
      metadata TEXT DEFAULT '{}',
      parent_id TEXT,
      version INTEGER DEFAULT 1,
      is_latest INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
  `);

  // Message versions for edit history
  await run(`
    CREATE TABLE IF NOT EXISTS message_versions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      message_id TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  await run(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_message_versions_message_id ON message_versions(message_id)`);

  console.log('[OK] Database migrations completed successfully');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('[ERROR] Migration failed:', err);
  process.exit(1);
});
