# Architecture & Technical Design

## 1. System Overview

The system delivers a real-time, low-latency conversational AI voice agent powered by the **Google Gemini Multimodal Live API**, coupled with an automated usage telemetry and cost analytics platform.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐  │
│  │    Embeddable Voice Widget   │    │   Real-Time Cost Dashboard   │  │
│  │   (PCM Audio In/Out + VAD)   │    │  (Recharts, SSE/WS, Metrics) │  │
│  └──────────────┬───────────────┘    └──────────────┬───────────────┘  │
└─────────────────┼───────────────────────────────────┼──────────────────┘
                  │ Client WebSocket                  │ HTTP & SSE (EventSource)
                  │ (Binary 16kHz PCM)                │ (JWT Auth Guard)
┌─────────────────▼───────────────────────────────────▼──────────────────┐
│                      BACKEND (Node.js + TypeScript)                     │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Audio Session Manager & Channel Adapters                         │  │
│  │ ├─ WebSocketChannelAdapter (Active browser client)               │  │
│  │ └─ TwilioMediaStreamAdapter (Telephony channel adapter)          │  │
│  └──────────────────────────────┬───────────────────────────────────┘  │
│                                 │                                      │
│  ┌──────────────────────────────▼───────────────────────────────────┐  │
│  │ Gemini Live Gateway (Bidirectional WS Proxy)                     │  │
│  │ ├─ Keeps Gemini API key strictly server-side                     │  │
│  │ ├─ Streams 16kHz PCM <--> 24kHz PCM                              │  │
│  │ ├─ Barge-in / Interruption dispatcher (clears client buffers)    │  │
│  │ └─ Usage & Cost Processor (extracts usageMetadata)               │  │
│  └──────────────┬───────────────────────────────────────────────────┘  │
│                 │                                                      │
│  ┌──────────────▼──────────────┐             ┌──────────────────────┐  │
│  │  Pricing Engine & Calculator│             │  Data Access Layer   │  │
│  │  (pricing.json + Vitest)    │             │  (SQLite / Postgres) │  │
│  └─────────────────────────────┘             └──────────┬───────────┘  │
└─────────────────────────────────────────────────────────┼──────────────┘
                  │                                       │
                  │ Upstream WebSocket                    │ Persistent Storage
                  ▼                                       ▼
    ┌───────────────────────────┐           ┌────────────────────────────┐
    │ Gemini Multimodal Live API│           │ Database (mma.db)          │
    │ (BidiGenerateContent)     │           │ - sessions                 │
    │                           │           │ - messages (transcripts)   │
    │                           │           │ - usage_events             │
    │                           │           │ - personas                 │
    └───────────────────────────┘           └────────────────────────────┘
```

---

## 2. Audio Pipeline & Latency Optimization

To achieve conversational cadence with sub-500ms time-to-first-audio:

1. **Client Audio Capture (16kHz 16-bit Linear PCM)**:
   - The browser captures microphone audio via `navigator.mediaDevices.getUserMedia`.
   - An `AudioContext` and script processor downsample the system audio (44.1kHz or 48kHz) to standard mono 16,000Hz 16-bit linear PCM.
   - Raw binary buffers are sent across the WebSocket without base64 or JSON wrapping.

2. **Upstream Streaming**:
   - The backend encodes PCM frames into Gemini `realtimeInput.mediaChunks` and forwards them to `wss://generativelanguage.googleapis.com/...`.

3. **Model Audio Output (24kHz 16-bit Linear PCM)**:
   - Gemini streams 24kHz linear PCM chunks in `serverContent.modelTurn.parts[].inlineData`.
   - The backend immediately forwards binary PCM chunks to the client.
   - The client `AudioStreamPlayer` maintains a lookahead schedule queue via the Web Audio API (`AudioBufferSourceNode`), playing incoming chunks continuously with zero gap or stutter.

---

## 3. Barge-In (Interruption) Mechanics

Natural turn-taking requires users to interrupt the AI when speaking.

```
User Speaks while Agent Speaks ──> Gemini Server-side VAD Triggers
                                              │
                                              ▼
                    Gemini sends `serverContent.interrupted = true`
                                              │
                                              ▼
                    Backend relays `{ type: "interrupted" }` to Client
                                              │
                                              ▼
                  Client Web Audio API instantly flushes buffer queue
                                              │
                                              ▼
                         Agent stops talking immediately!
```

---

## 4. Channel Abstraction Layer

Voice communication is decoupled from web browsers using the `AudioChannelAdapter` interface:

```typescript
export interface AudioChannelAdapter {
  readonly channelType: 'websocket' | 'twilio' | 'custom';
  readonly sessionId: string;
  sendAudio(pcmChunk: Buffer): void;
  sendControl(event: any): void;
  onClientAudio(callback: (chunk: Buffer) => void): void;
  onClientText(callback: (text: string) => void): void;
  onDisconnect(callback: (reason?: string) => void): void;
  close(code?: number, reason?: string): void;
}
```

- **Browser WebSockets**: Handled by `WebSocketChannelAdapter`.
- **Telephony**: Handled by `TwilioMediaStreamAdapter` (resamples 8kHz $\mu$-law to 16kHz PCM).
- **Mobile Apps**: Implement the exact same binary WebSocket frame contract.
