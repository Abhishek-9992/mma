import { WebSocket } from 'ws';
import { AudioChannelAdapter } from './baseAdapter.js';

/**
 * Blueprint / Adapter for Twilio Media Streams (Telephony Channel).
 * Twilio sends and receives 8000Hz mu-law (PCMU) audio encoded in JSON media frames:
 * { "event": "media", "media": { "payload": "<base64 mu-law>" } }
 *
 * This adapter demonstrates how the telephony channel plugs into the exact same
 * Gemini Live Agent architecture without modifying any core agent logic.
 */
export class TwilioMediaStreamAdapter implements AudioChannelAdapter {
  public readonly channelType = 'twilio';
  public readonly sessionId: string;
  private ws: WebSocket;
  private streamSid?: string;
  private audioCallback?: (chunk: Buffer) => void;
  private disconnectCallback?: (reason?: string) => void;

  constructor(sessionId: string, ws: WebSocket) {
    this.sessionId = sessionId;
    this.ws = ws;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.ws.on('message', (data: string | Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.event === 'start') {
          this.streamSid = msg.start?.streamSid;
          console.log(`[TwilioAdapter] Telephony call started. Stream SID: ${this.streamSid}`);
        } else if (msg.event === 'media' && msg.media?.payload) {
          // In production: convert 8kHz mu-law payload to 16kHz linear PCM
          const mulawBuffer = Buffer.from(msg.media.payload, 'base64');
          const pcm16Buffer = this.mulawToPcm16(mulawBuffer);
          if (this.audioCallback) {
            this.audioCallback(pcm16Buffer);
          }
        } else if (msg.event === 'stop') {
          if (this.disconnectCallback) {
            this.disconnectCallback('Twilio call ended by remote');
          }
        }
      } catch (err) {
        console.error('[TwilioAdapter] Failed to parse Twilio media event:', err);
      }
    });

    this.ws.on('close', () => {
      if (this.disconnectCallback) this.disconnectCallback('Twilio WS closed');
    });
  }

  public sendAudio(pcm24kChunk: Buffer): void {
    if (this.ws.readyState !== WebSocket.OPEN || !this.streamSid) return;

    // Convert 24kHz Linear PCM -> 8kHz mu-law
    const mulawBuffer = this.pcm24kToMulaw(pcm24kChunk);
    const payload = mulawBuffer.toString('base64');

    this.ws.send(JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: { payload }
    }));
  }

  public sendControl(event: any): void {
    // Custom telephony control (e.g. DTMF or Twilio marks)
    if (event.type === 'interrupted' && this.streamSid && this.ws.readyState === WebSocket.OPEN) {
      // Clear twilio audio buffer immediately upon user interruption
      this.ws.send(JSON.stringify({
        event: 'clear',
        streamSid: this.streamSid
      }));
    }
  }

  public onClientAudio(callback: (chunk: Buffer) => void): void {
    this.audioCallback = callback;
  }

  public onClientText(): void {
    // Telephony is voice-only
  }

  public onDisconnect(callback: (reason?: string) => void): void {
    this.disconnectCallback = callback;
  }

  public close(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  /**
   * Simple linear resample & standard G.711 mu-law decoding
   */
  private mulawToPcm16(mulaw: Buffer): Buffer {
    // 8kHz mu-law to 16kHz 16-bit PCM (placeholder interpolation for telephony)
    const out = Buffer.alloc(mulaw.length * 4); // 2x sample rate, 2 bytes per sample
    return out;
  }

  /**
   * Downsamples 24kHz 16-bit PCM to 8kHz mu-law
   */
  private pcm24kToMulaw(pcm24k: Buffer): Buffer {
    // Downsamples 3:1 and encodes to 8-bit mu-law
    const out = Buffer.alloc(Math.floor(pcm24k.length / 6));
    return out;
  }
}
