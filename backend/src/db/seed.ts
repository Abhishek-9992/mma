import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './connection.js';
import { authService } from '../services/authService.js';
import { sessionService } from '../services/sessionService.js';
import { defaultPricingService } from '../services/pricingService.js';
import { GeminiUsageMetadata } from '../models/types.js';

console.log('🌱 Starting MMA Seed Script...');

// 1. Initialize schema
initDatabase();

// 2. Ensure admin user & personas
authService.ensureDefaultAdmin();
sessionService.ensureDefaultPersonas();

const personas = sessionService.getPersonas();
console.log(`Found ${personas.length} personas for seeding.`);

// Clean existing test sessions
db.prepare('DELETE FROM messages').run();
db.prepare('DELETE FROM usage_events').run();
db.prepare('DELETE FROM sessions').run();

const sampleDialogues: Record<string, Array<{ user: string; assistant: string }>> = {
  'persona-general': [
    {
      user: "Hi Nova! Could you explain how quantum computing differs from classical computing in simple terms?",
      assistant: "Hello! Absolutely. While classical computers process information using bits that are either zero or one, quantum computers use qubits. Qubits can exist in a superposition of both states simultaneously, allowing quantum systems to explore vast combinatorial possibilities all at once."
    },
    {
      user: "That makes a lot of sense. What are the best practical use cases for it today?",
      assistant: "Key near-term applications include molecular simulation for drug discovery, complex financial modeling, cryptography, and large-scale optimization problems like supply chain logistics."
    }
  ],
  'persona-support': [
    {
      user: "Hey Atlas, I'm having trouble connecting my webhook endpoints to the live event stream.",
      assistant: "I can certainly assist with that. Let's make sure the webhook receiver returns an HTTP 200 status code within three seconds. Have you verified that your HMAC secret signature verification matches our signature header?"
    },
    {
      user: "Ah, good catch! I was validating against the old signing secret from my sandbox environment.",
      assistant: "That is a very common oversight when switching environments! Once you update your environment variable to the production secret, your webhooks should receive payloads immediately."
    }
  ],
  'persona-sales': [
    {
      user: "Hi Zephyr, we are evaluating your conversational AI platform for about 50,000 monthly active calls.",
      assistant: "Welcome! At 50,000 monthly voice calls, our Enterprise Tier is tailored specifically for you. It provides sub-300ms latency, dedicated throughput guarantees, and custom persona voice cloning."
    },
    {
      user: "What does the typical cost structure look like per minute of voice conversation?",
      assistant: "Our blended voice rate averages between three to four cents per minute, which is roughly seventy percent more cost-effective than legacy telephony transcription pipelines."
    }
  ],
  'persona-concierge': [
    {
      user: "Good afternoon Lyra, I need a private dining table for six in Manhattan tonight around 8 PM.",
      assistant: "Good afternoon. I would recommend Le Bernardin or The Modern. Both feature exquisite seasonal tasting menus and have private alcoves available this evening. Shall I reserve The Modern for your party of six?"
    },
    {
      user: "Yes please, confirm The Modern under the name Sterling.",
      assistant: "Magnificent choice. Your table at The Modern is requested for 8:00 PM under Sterling. A confirmation note with arrival details will be sent immediately."
    }
  ]
};

const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

console.log('Generating realistic session records across past 10 days...');

for (let i = 0; i < 28; i++) {
  const persona = personas[i % personas.length];
  const daysAgo = Math.floor(i / 3);
  const sessionStartTime = new Date(now - daysAgo * oneDayMs - (i % 6) * 3600 * 1000);
  const sessionId = uuidv4();

  // Status distribution: 2 active, 1 error, rest completed
  let status: 'completed' | 'active' | 'error' = 'completed';
  if (i === 0) status = 'active';
  else if (i === 1) status = 'active';
  else if (i === 15) status = 'error';

  const durationSec = status === 'active' ? Math.floor(45 + Math.random() * 60) : Math.floor(40 + Math.random() * 260);
  const sessionEndTime = status === 'active' ? null : new Date(sessionStartTime.getTime() + durationSec * 1000).toISOString();

  // Audio token generation (~32 tokens/second input, ~40 tokens/second output)
  const promptAudioTokens = Math.floor(durationSec * 16 * (0.8 + Math.random() * 0.4));
  const promptTextTokens = Math.floor(80 + Math.random() * 120);
  const candidatesAudioTokens = Math.floor(durationSec * 22 * (0.8 + Math.random() * 0.4));
  const candidatesTextTokens = Math.floor(60 + Math.random() * 140);

  const metadata: GeminiUsageMetadata = {
    promptTokenCount: promptAudioTokens + promptTextTokens,
    candidatesTokenCount: candidatesAudioTokens + candidatesTextTokens,
    totalTokenCount: promptAudioTokens + promptTextTokens + candidatesAudioTokens + candidatesTextTokens,
    promptTokensDetails: [
      { modality: 'TEXT', tokenCount: promptTextTokens },
      { modality: 'AUDIO', tokenCount: promptAudioTokens }
    ],
    candidatesTokensDetails: [
      { modality: 'TEXT', tokenCount: candidatesTextTokens },
      { modality: 'AUDIO', tokenCount: candidatesAudioTokens }
    ]
  };

  const costResult = defaultPricingService.calculateCost('gemini-2.0-flash-exp', metadata);

  // Insert session
  db.prepare(`
    INSERT INTO sessions (
      id, persona_id, persona_name, status, started_at, ended_at, duration_seconds,
      model_name, prompt_tokens_text, prompt_tokens_audio, candidates_tokens_text, candidates_tokens_audio,
      total_tokens, total_cost_usd, client_ip, user_agent, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    sessionId,
    persona.id,
    persona.name,
    status,
    sessionStartTime.toISOString(),
    sessionEndTime,
    durationSec,
    'gemini-2.0-flash-exp',
    costResult.promptTokensText,
    costResult.promptTokensAudio,
    costResult.candidatesTokensText,
    costResult.candidatesTokensAudio,
    costResult.totalTokens,
    costResult.totalCostUsd,
    `192.168.1.${10 + (i % 50)}`,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0',
    status === 'error' ? 'Audio stream buffer overflow' : null
  );

  // Insert dialogue messages
  const dialogues = sampleDialogues[persona.id] || sampleDialogues['persona-general'];
  let msgTime = sessionStartTime.getTime();

  for (const turn of dialogues) {
    // User message
    msgTime += 5000;
    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, audio_duration_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), sessionId, 'user', turn.user, new Date(msgTime).toISOString(), 4200);

    // Assistant message
    msgTime += 8000;
    db.prepare(`
      INSERT INTO messages (id, session_id, role, content, timestamp, audio_duration_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), sessionId, 'assistant', turn.assistant, new Date(msgTime).toISOString(), 9500);
  }

  // Insert usage event
  db.prepare(`
    INSERT INTO usage_events (
      id, session_id, timestamp, prompt_tokens, candidates_tokens, total_tokens, incremental_cost_usd, raw_details_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    sessionId,
    new Date(sessionStartTime.getTime() + (durationSec * 1000) / 2).toISOString(),
    costResult.totalPromptTokens,
    costResult.totalCandidatesTokens,
    costResult.totalTokens,
    costResult.totalCostUsd,
    JSON.stringify(metadata)
  );
}

const summary = sessionService.getDashboardSummary();
console.log(' Seed complete!');
console.log(`📊 Total Sessions: ${summary.totalSessions}`);
console.log(`Active Sessions: ${summary.activeSessions}`);
console.log(`Completed Sessions: ${summary.completedSessions}`);
console.log(`Total Tokens: ${summary.totalTokens.toLocaleString()}`);
console.log(`💰 Total Cost: $${summary.totalCostUsd.toFixed(4)}`);
