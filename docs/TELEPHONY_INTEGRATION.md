# Telephony Integration Guide (Twilio Media Streams & SIP)

The architecture is built from day one to support phone calls without changing the core Gemini Live pipeline.

## 1. Overview of Twilio Media Streams

Twilio Media Streams allow bidirectional streaming of phone call audio over WebSockets:
- Audio Format: **8000Hz 8-bit $\mu$-law (G.711 PCMU)**.
- WebSocket Envelope: JSON frames containing base64 encoded audio payloads.

```
PSTN Phone Call ──> Twilio Voice ──> WebSocket ──> TwilioMediaStreamAdapter ──> Gemini Live API
  (Analog/VoIP)       (8kHz mu-law)                  (16kHz/24kHz PCM)           (Realtime Audio)
```

---

## 2. Twilio TwiML Configuration

When a phone call arrives at your Twilio phone number, return the following TwiML response pointing to your backend WebSocket URL:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Connecting to your Gemini AI assistant.</Say>
  <Connect>
    <Stream url="wss://your-domain.com/ws/twilio?personaId=persona-support" />
  </Connect>
</Response>
```

---

## 3. Telephony Adapter Code

The included `TwilioMediaStreamAdapter` (`backend/src/adapters/twilioAdapter.ts`) handles the conversion:

1. **Inbound audio from phone caller**:
   - Twilio sends `{ "event": "media", "media": { "payload": "..." } }`.
   - The adapter decodes base64 8kHz $\mu$-law into linear 16-bit PCM and resamples to 16,000Hz.
   - Forwards PCM chunk to `GeminiLiveSession`.

2. **Outbound audio from Gemini to caller**:
   - Gemini sends 24kHz 16-bit linear PCM.
   - The adapter downsamples to 8kHz $\mu$-law and packages into Twilio media frames.

3. **Barge-in on phone**:
   - When Gemini detects speech from the caller, it emits `interrupted: true`.
   - The adapter immediately transmits `{ "event": "clear", "streamSid": "..." }` to Twilio, clearing Twilio's audio playback queue so the agent stops talking instantaneously on the caller's handset!
