import { WebSocket } from 'ws';
import { AudioChannelAdapter } from './baseAdapter.js';

export class WebSocketChannelAdapter implements AudioChannelAdapter {
  public readonly channelType = 'websocket';
  public readonly sessionId: string;
  private ws: WebSocket;
  private audioCallback?: (chunk: Buffer) => void;
  private textCallback?: (text: string) => void;
  private disconnectCallback?: (reason?: string) => void;

  constructor(sessionId: string, ws: WebSocket) {
    this.sessionId = sessionId;
    this.ws = ws;

    this.setupListeners();
  }

  private setupListeners(): void {
    this.ws.on('message', (data: Buffer | string, isBinary: boolean) => {
      if (isBinary) {
        // Direct raw binary PCM audio frame (16kHz, 16-bit Mono)
        if (this.audioCallback) {
          const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
          this.audioCallback(buffer);
        }
      } else {
        // Text / JSON control message from client
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);

          if (parsed.type === 'audio' && parsed.data) {
            const buf = Buffer.from(parsed.data, 'base64');
            if (this.audioCallback) {
              this.audioCallback(buf);
            }
          } else if (parsed.type === 'text' && parsed.text) {
            if (this.textCallback) {
              this.textCallback(parsed.text);
            }
          }
        } catch (err) {
          console.error(`[WebSocketAdapter] Malformed JSON message for session ${this.sessionId}:`, err);
        }
      }
    });

    this.ws.on('close', (code, reason) => {
      if (this.disconnectCallback) {
        this.disconnectCallback(`Closed (${code}): ${reason?.toString() || 'normal'}`);
      }
    });

    this.ws.on('error', (err) => {
      console.error(`[WebSocketAdapter] WS error on session ${this.sessionId}:`, err);
      if (this.disconnectCallback) {
        this.disconnectCallback(`Error: ${err.message}`);
      }
    });
  }

  public sendAudio(pcmChunk: Buffer): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      // Send raw binary buffer for ultra-low latency streaming
      this.ws.send(pcmChunk, { binary: true });
    }
  }

  public sendControl(event: any): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  public onClientAudio(callback: (chunk: Buffer) => void): void {
    this.audioCallback = callback;
  }

  public onClientText(callback: (text: string) => void): void {
    this.textCallback = callback;
  }

  public onDisconnect(callback: (reason?: string) => void): void {
    this.disconnectCallback = callback;
  }

  public close(code = 1000, reason = 'Normal closure'): void {
    if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
      this.ws.close(code, reason);
    }
  }
}
