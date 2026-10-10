# 🛠️ Developer & Contributor Guide

A comprehensive guide for engineers extending, customizing, and debugging the Gemini Live AI Voice Agent and Cost Analytics platform.

---

## 🏗️ Architecture Overview

The application follows an asynchronous event-driven architecture designed around **low-latency streaming audio**:

```
[Browser Mic] ──(16kHz PCM)──> [WebSocket Adapter] ──(MediaChunk)──> [Gemini Live WS]
                                                                            │
[Browser Speaker] <──(24kHz PCM)── [AudioStreamPlayer] <──(PCM buffer)──────┘
```

---

## ⚙️ Environment Variables

Configuration is managed via `.env` in the `backend/` directory:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP & WebSocket port | `5000` |
| `NODE_ENV` | Runtime environment (`development` / `production`) | `development` |
| `GEMINI_API_KEY` | Google AI Studio Gemini API Key | `AQ.Ab8RN6KL...` |
| `GEMINI_MODEL` | Gemini Live capable model | `gemini-2.5-flash-native-audio-latest` |
| `JWT_SECRET` | Secret key for signing admin JWT tokens | `super-secret-jwt-key-...` |
| `ADMIN_USERNAME` | Administrator dashboard username | `admin` |
| `ADMIN_PASSWORD` | Administrator dashboard password | `admin123` |
| `DB_PATH` | Path to SQLite database file | `./data/mma.db` |
| `CORS_ORIGIN` | Allowed CORS origins | `http://localhost:5173` |

---

## 🎧 Audio Processing Pipeline Deep-Dive

### 1. Browser Microphone Capture & Resampling
The browser's native `AudioContext` typically operates at the hardware's native rate (44.1 kHz or 48 kHz). Gemini Live expects **16,000 Hz, 1-channel, 16-bit linear PCM**.

Located in `frontend/src/lib/audioUtils.ts`:
```typescript
export function convertTo16kHzPcm(inputData: Float32Array, inputSampleRate: number): ArrayBuffer {
  // 1. Resample from inputSampleRate -> 16,000 Hz
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.round(inputData.length / ratio);
  const result = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const originalIndex = Math.min(Math.round(i * ratio), inputData.length - 1);
    // Clamp Float32 [-1.0, 1.0] to signed Int16 [-32768, 32767]
    const s = Math.max(-1, Math.min(1, inputData[originalIndex]));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }

  return result.buffer;
}
```

### 2. Audio Playback (Jitter-Free Lookahead Scheduling)
Gemini outputs 24kHz linear PCM in discrete fragments. If you play each fragment individually with `AudioBufferSourceNode.start()`, gaps and clicks will occur between chunks.

The `AudioStreamPlayer` implements continuous lookahead scheduling:
```typescript
export class AudioStreamPlayer {
  private scheduledTime = 0;

  playChunk(arrayBuffer: ArrayBuffer) {
    const audioBuffer = this.pcmToAudioBuffer(arrayBuffer, 24000);
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);

    // Schedule playback at next continuous timestamp
    const now = this.ctx.currentTime;
    const startTime = Math.max(now, this.scheduledTime);
    source.start(startTime);
    this.scheduledTime = startTime + audioBuffer.duration;
  }

  flush() {
    // Instant stop during barge-in interruptions
    this.activeNodes.forEach(node => node.stop());
    this.activeNodes = [];
    this.scheduledTime = 0;
  }
}
```

---

## 🎭 Creating Custom Personas

Personas control the voice agent's tone, instructions, and vocal timbre.

### Adding a Persona via Database Migration or Code:
Personas are stored in the SQLite `personas` table (`backend/src/db/schema.sql`):

```sql
INSERT INTO personas (id, name, description, system_prompt, voice_name, temperature, is_default)
VALUES (
  'persona-medical',
  'Dr. Sarah - Clinical Triage Assistant',
  'Empathetic and structured medical intake assistant.',
  'You are Dr. Sarah, an AI clinical intake assistant. Speak calmly and empathetically. Ask clarifying questions one at a time.',
  'Kore',
  0.5,
  0
);
```

### Supported Prebuilt Gemini Voices:
- `Aoede` (Default, warm, versatile female)
- `Puck` (Energetic, engaging male)
- `Fenrir` (Deep, authoritative male)
- `Kore` (Calm, structured female)

---

## 💰 Updating Model Pricing Rates

Model rates are maintained in `backend/src/config/pricing.json`.

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

### Mathematical Cost Formula:
The pricing engine in `backend/src/services/pricingService.ts` computes the exact cost per token modality:

$$\text{Cost} = \frac{T_{\text{text, in}} \times R_{\text{text, in}} + T_{\text{audio, in}} \times R_{\text{audio, in}} + T_{\text{text, out}} \times R_{\text{text, out}} + T_{\text{audio, out}} \times R_{\text{audio, out}}}{1,000,000}$$

---

## 🔌 Adding a New Audio Channel Adapter

The system abstracts channel I/O via the `AudioChannelAdapter` interface (`backend/src/adapters/baseAdapter.ts`):

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

To support a new platform (e.g., Discord Voice, LiveKit, or WebRTC):
1. Create a class implementing `AudioChannelAdapter`.
2. Implement `sendAudio` to transcode 24kHz linear PCM to the target channel format (e.g. Opus or $\mu$-law).
3. Connect incoming audio stream to `onClientAudio` downsampled to 16kHz linear PCM.
4. Pass the new adapter instance to `new GeminiLiveProxy(adapter, persona)`.

---

## 🧪 Testing & Quality Assurance

### Run Unit Tests
```bash
cd backend
npx vitest run
```

Tests validate:
- Accurate cost calculation across all token modalities
- Fallback pricing behavior when token details are omitted
- Zero-cost handling for empty frames
- High-precision IEEE floating-point arithmetic rounding

---

## 🔍 Debugging & Troubleshooting

### 1. View Active Live Database Sessions
Inspect the SQLite database directly from terminal:
```bash
node -e "const db = require('better-sqlite3')('./backend/data/mma.db'); console.table(db.prepare('SELECT id, status, total_tokens, total_cost_usd, duration_seconds FROM sessions ORDER BY started_at DESC LIMIT 5').all());"
```

### 2. Verify Port Availability
```powershell
netstat -ano | findstr :5000
```

### 3. Check Real-Time WebSocket Handshake
Run our automated gateway test:
```bash
node -e "const WebSocket = require('ws'); const ws = new WebSocket('ws://localhost:5000/ws/voice?personaId=persona-general'); ws.on('message', d => console.log('Event:', JSON.parse(d.toString())));"
```
