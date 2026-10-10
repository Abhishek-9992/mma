# 📘 System Setup, Architecture & Maintenance Guide

A complete, practical guide covering **system setup**, **technical architecture**, and **how to extend and maintain** the Gemini Live AI Voice Agent & Cost Analytics platform.

---

## 🎯 1. System Setup Guide

### Prerequisites
- **Node.js**: v20.x or v22.x (Recommended: v22.14.0+)
- **Package Manager**: `npm` (v10+)
- **API Key**: Google Gemini API key with access to the Live API (`BidiGenerateContent`).

---

### Step-by-Step Installation

#### Step 1: Clone & Install Backend
```bash
cd backend
npm install
```

#### Step 2: Environment Configuration
Create or update `backend/.env`:
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash-native-audio-latest
JWT_SECRET=super-secret-jwt-key-mma-gemini-2026
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

#### Step 3: Database Initialization & Seeding
```bash
# Creates SQLite database at ./data/mma.db and inserts default personas & realistic sample sessions
npm run seed
```

#### Step 4: Run Pricing Engine Unit Tests
```bash
npm test
```

#### Step 5: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

### Running the Application

```bash
# Terminal 1: Backend (Server & WebSocket Gateway on http://localhost:5000)
cd backend
npm run dev

# Terminal 2: Frontend (Vite UI on http://localhost:5173)
cd frontend
npm run dev
```

> **Note on `EADDRINUSE` Errors:**
> If you get `listen EADDRINUSE: address already in use :::5000` or `Port 5173 is in use`, it means the servers are **already running in the background**!
> You do **not** need to re-run `npm run dev`. Simply open **[http://localhost:5173/](http://localhost:5173/)** in your browser.

---

## 🏗️ 2. Technical Architecture

### High-Level Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
│  │    Embeddable Voice Widget   │    │   Real-Time Cost Dashboard   │  │
│  │   (16kHz Mic / 24kHz Speaker)│    │  (Recharts, SSE Stream, JWT) │  │
│  └──────────────┬───────────────┘    └──────────────┬───────────────┘  │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │ Client WebSocket                  │ HTTP & SSE (EventSource)
                  │ (Binary 16kHz PCM)                │ (JWT Authorization)
┌─────────────────▼───────────────────────────────────▼──────────────────┐
│                      BACKEND (Node.js + TypeScript)                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Audio Session Manager & Channel Adapters                         │  │
│  │ ├─ WebSocketChannelAdapter (Browser audio stream)                │  │
│  │ └─ TwilioMediaStreamAdapter (Telephony channel adapter)          │  │
│  └──────────────┬───────────────────────────────────────────────────┘  │
│                 │                                                      │
│  ┌──────────────▼───────────────────────────────────────────────────┐  │
│  │ Gemini Live Gateway Proxy (`geminiLiveProxy.ts`)                 │  │
│  │ ├─ Upstream WSS to Google Gemini Live API                        │  │
│  │ ├─ Server-side VAD interruption detection (Barge-in dispatcher)  │  │
│  │ └─ Modality token telemetry extractor (`usageMetadata`)          │  │
│  └──────────────┬───────────────────────────────────────────────────┘  │
│                 │                                                      │
│  ┌──────────────▼──────────────┐             ┌──────────────────────┐  │
│  │  Pricing Engine & Calculator│             │  Data Access Layer   │  │
│  │  (pricing.json + Vitest)    │             │  (SQLite `mma.db`)   │  │
│  └─────────────────────────────┘             └──────────┬───────────┘  │
└─────────────────────────────────────────────────────────┼──────────────┘
                  │                                       │
                  ▼ Upstream WebSocket                    ▼ Persistent Storage
    ┌───────────────────────────┐           ┌────────────────────────────┐
    │ Gemini Multimodal Live API│           │ Database (mma.db)          │
    │ (BidiGenerateContent)     │           │ - sessions                 │
    │                           │           │ - messages (transcripts)   │
    │                           │           │ - usage_events             │
    │                           │           │ - personas                 │
    └───────────────────────────┘           └────────────────────────────┘
```

---

### Core Components & Subsystems

1. **Voice WebSocket Gateway (`backend/src/services/geminiLiveProxy.ts`)**:
   - Manages secure bidirectional proxying between web clients and Google's `BidiGenerateContent` WebSocket endpoint.
   - Keeps the Gemini API key strictly server-side.
   - Forwards 16kHz PCM audio input from browser microphone to Gemini `realtimeInput`.
   - Streams 24kHz PCM synthesized speech output back to the client.

2. **Barge-In (Interruption) Engine**:
   - Detects when the user speaks while the AI is outputting audio (`serverContent.interrupted = true`).
   - Immediately dispatches an `interrupted` event to the client to flush its Web Audio API buffer queue (`player.flush()`), instantly halting playback.

3. **Modality-Aware Pricing Engine (`backend/src/services/pricingService.ts`)**:
   - Parses Gemini `usageMetadata` frames containing exact token modality details (`TEXT` vs `AUDIO` for prompt input and candidates output).
   - Multiplies tokens by pricing rates defined in `backend/src/config/pricing.json`.

4. **Real-Time Telemetry Stream (`backend/src/services/sseService.ts`)**:
   - Pushes live call activity, token consumption, and dollar spend events to dashboard clients over Server-Sent Events (SSE).

---

## 🔧 3. Extension & Maintenance Guide

### How to Add or Modify Personas

Personas control the voice agent's name, system prompt, and voice timbre.

1. **Edit via SQLite Database**:
   ```sql
   INSERT INTO personas (id, name, description, system_prompt, voice_name, temperature, is_default)
   VALUES (
     'persona-sales',
     'Marcus - Enterprise SDR',
     'Persuasive, professional B2B sales agent.',
     'You are Marcus, an enterprise sales representative. Be articulate, polite, and focused on discovering customer pain points.',
     'Puck',
     0.7,
     0
   );
   ```

2. **Supported Gemini Voice Timbres**:
   - `Aoede` (Warm, natural female)
   - `Puck` (Energetic, friendly male)
   - `Fenrir` (Deep, authoritative male)
   - `Kore` (Calm, soothing female)

---

### How to Update Billing & Pricing Rates

Rates are maintained centrally in `backend/src/config/pricing.json`:

```json
{
  "gemini-2.5-flash-native-audio-latest": {
    "textInputPerMillion": 0.10,
    "audioInputPerMillion": 0.70,
    "textOutputPerMillion": 0.40,
    "audioOutputPerMillion": 0.70
  }
}
```

To update rates or add a new model family:
1. Update `pricing.json`.
2. Run `npm test` in `backend/` to verify tests pass against the new configuration.

---

### How to Add a New Audio Channel (e.g., Phone Lines or Mobile Apps)

Audio channels inherit from the abstract `AudioChannelAdapter` interface (`backend/src/adapters/baseAdapter.ts`):

```typescript
export interface AudioChannelAdapter {
  readonly channelType: 'websocket' | 'twilio' | 'custom';
  readonly sessionId: string;
  sendAudio(pcmChunk: Buffer): void;
  sendControl(event: { type: string; [key: string]: any }): void;
  onClientAudio(callback: (chunk: Buffer) => void): void;
  onClientText(callback: (text: string) => void): void;
  onDisconnect(callback: (reason?: string) => void): void;
  close(code?: number, reason?: string): void;
}
```

To connect **Twilio Voice**:
- Use `TwilioMediaStreamAdapter` (`backend/src/adapters/twilioAdapter.ts`).
- Transcode incoming 8kHz $\mu$-law audio to 16kHz linear PCM.
- Pass the adapter instance into `new GeminiLiveProxy(adapter, persona)`.

---

### Maintenance & Health Checks

1. **Verify Backend Health**:
   ```bash
   curl http://localhost:5000/api/health
   # Returns: {"status":"ok","timestamp":"..."}
   ```

2. **Inspect Database Contents**:
   ```bash
   node -e "const db = require('better-sqlite3')('./backend/data/mma.db'); console.table(db.prepare('SELECT id, status, total_tokens, total_cost_usd FROM sessions LIMIT 5').all());"
   ```

3. **Check Active Ports**:
   ```powershell
   netstat -ano | findstr :5000
   ```
