-- MMA AI Voice Agent & Cost Analytics Database Schema
-- Compatible with SQLite (and portable to PostgreSQL)

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  voice_name TEXT NOT NULL DEFAULT 'Puck',
  temperature REAL DEFAULT 0.7,
  is_default INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  persona_name TEXT,
  status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'error')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_seconds REAL DEFAULT 0,
  model_name TEXT NOT NULL DEFAULT 'gemini-2.0-flash-exp',
  prompt_tokens_text INTEGER DEFAULT 0,
  prompt_tokens_audio INTEGER DEFAULT 0,
  candidates_tokens_text INTEGER DEFAULT 0,
  candidates_tokens_audio INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  client_ip TEXT,
  user_agent TEXT,
  error_message TEXT,
  FOREIGN KEY(persona_id) REFERENCES personas(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  audio_duration_ms INTEGER DEFAULT 0,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  candidates_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  incremental_cost_usd REAL DEFAULT 0,
  raw_details_json TEXT,
  FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL
);

-- Indices for rapid dashboard aggregation and live queries
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_session_id ON usage_events(session_id);
