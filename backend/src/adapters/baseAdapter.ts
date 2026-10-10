export interface AudioChannelAdapter {
  readonly channelType: 'websocket' | 'twilio' | 'custom';
  readonly sessionId: string;

  /**
   * Send an audio buffer (PCM 24kHz) to the client channel
   */
  sendAudio(pcmChunk: Buffer): void;

  /**
   * Send a JSON control event (e.g. transcript, interrupted, usage) to the client
   */
  sendControl(event: {
    type: 'setup_complete' | 'transcript' | 'transcript_chunk' | 'interrupted' | 'turn_complete' | 'usage' | 'error';
    [key: string]: any;
  }): void;

  /**
   * Callback when client sends audio (16kHz PCM)
   */
  onClientAudio(callback: (chunk: Buffer) => void): void;

  /**
   * Callback when client sends text
   */
  onClientText(callback: (text: string) => void): void;

  /**
   * Callback when client disconnects
   */
  onDisconnect(callback: (reason?: string) => void): void;

  /**
   * Gracefully close channel
   */
  close(code?: number, reason?: string): void;
}
