import { WebSocket } from 'ws';
import { CONFIG } from '../config/env.js';
import { AudioChannelAdapter } from '../adapters/baseAdapter.js';
import { sessionService } from './sessionService.js';
import { GeminiUsageMetadata, Persona } from '../models/types.js';

export class GeminiLiveSession {
  public readonly sessionId: string;
  private channel: AudioChannelAdapter;
  private persona: Persona;
  private geminiWs: WebSocket | null = null;
  private isConnected = false;
  private isSetupComplete = false;
  private assistantTranscriptBuffer = '';
  private userTranscriptBuffer = '';
  private currentTurnAudioBytes = 0;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(sessionId: string, channel: AudioChannelAdapter, persona: Persona) {
    this.sessionId = sessionId;
    this.channel = channel;
    this.persona = persona;
  }

  public async connect(): Promise<void> {
    const model = CONFIG.geminiModel || 'gemini-2.0-flash-exp';
    const apiKey = CONFIG.geminiApiKey;

    if (!apiKey) {
      console.error(`[GeminiLive] No API key available for session ${this.sessionId}`);
      this.channel.sendControl({
        type: 'error',
        error: 'Gemini API Key is not configured on the server.'
      });
      sessionService.endSession(this.sessionId, 'error', 'Missing GEMINI_API_KEY');
      return;
    }

    // Official Multimodal Live API WebSocket URL
    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

    console.log(`[GeminiLive] Connecting to Gemini Live API for session ${this.sessionId} with model ${model}...`);

    try {
      this.geminiWs = new WebSocket(geminiUrl);
      this.setupGeminiListeners();
      this.setupChannelListeners();
    } catch (err: any) {
      console.error(`[GeminiLive] Connection error on session ${this.sessionId}:`, err);
      this.channel.sendControl({
        type: 'error',
        error: `Failed to initiate Gemini connection: ${err.message}`
      });
      sessionService.endSession(this.sessionId, 'error', err.message);
    }
  }

  private setupGeminiListeners(): void {
    if (!this.geminiWs) return;

    this.geminiWs.on('open', () => {
      console.log(`[GeminiLive] WebSocket connected to Gemini for session ${this.sessionId}`);
      this.isConnected = true;
      this.sendSetupMessage();

      // Keepalive ping every 25s
      this.pingInterval = setInterval(() => {
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
          this.geminiWs.ping();
        }
      }, 25000);
    });

    this.geminiWs.on('message', (raw: Buffer | string) => {
      this.handleGeminiMessage(raw.toString());
    });

    this.geminiWs.on('close', (code, reason) => {
      console.log(`[GeminiLive] Upstream closed for session ${this.sessionId} (${code}): ${reason}`);
      this.cleanup();
      sessionService.endSession(this.sessionId, 'completed');
      this.channel.close(code, reason.toString());
    });

    this.geminiWs.on('error', (err) => {
      console.error(`[GeminiLive] Upstream error on session ${this.sessionId}:`, err);
      this.channel.sendControl({
        type: 'error',
        error: `Gemini Live error: ${err.message}`
      });
      sessionService.endSession(this.sessionId, 'error', err.message);
    });
  }

  private sendSetupMessage(): void {
    if (!this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

    const modelName = CONFIG.geminiModel.startsWith('models/')
      ? CONFIG.geminiModel
      : `models/${CONFIG.geminiModel}`;

    // SQLite returns snake_case column names, so support both
    const voiceName = (this.persona as any).voice_name || this.persona.voiceName || 'Aoede';
    const systemPrompt = (this.persona as any).system_prompt || this.persona.systemPrompt || 'You are a helpful voice assistant.';

    const generationConfig: Record<string, unknown> = {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName
          }
        }
      }
    };

    const setupPayload = {
      setup: {
        model: modelName,
        generationConfig,
        systemInstruction: {
          parts: [
            {
              text: `${systemPrompt}\n\nImportant instructions: Speak naturally with expressive prosody. Avoid formatting characters, markdown, or emojis in spoken replies. Keep spoken answers concise, direct, and conversational.`
            }
          ]
        }
      }
    };

    console.log(`[GeminiLive] Sending Setup Frame with voice: ${voiceName} and model: ${modelName}`);
    this.geminiWs.send(JSON.stringify(setupPayload));
  }

  private setupChannelListeners(): void {
    // 1. Client audio streaming (16kHz PCM chunks)
    this.channel.onClientAudio((pcm16Chunk: Buffer) => {
      if (!this.isConnected || !this.isSetupComplete || !this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) {
        return;
      }

      // Wrap PCM chunk into Gemini realtimeInput format
      const audioMessage = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: 'audio/pcm;rate=16000',
              data: pcm16Chunk.toString('base64')
            }
          ]
        }
      };

      try {
        this.geminiWs.send(JSON.stringify(audioMessage));
      } catch (err) {
        console.error(`[GeminiLive] Failed to forward client audio for session ${this.sessionId}:`, err);
      }
    });

    // 2. Client text message (e.g. text fallback or prompt injection)
    this.channel.onClientText((text: string) => {
      if (!this.isConnected || !this.geminiWs || this.geminiWs.readyState !== WebSocket.OPEN) return;

      console.log(`[GeminiLive] Received client text turn: "${text}"`);
      sessionService.addMessage(this.sessionId, 'user', text);
      this.channel.sendControl({ type: 'transcript', role: 'user', text });

      const clientContentMessage = {
        clientContent: {
          turns: [
            {
              role: 'user',
              parts: [{ text }]
            }
          ],
          turnComplete: true
        }
      };

      this.geminiWs.send(JSON.stringify(clientContentMessage));
    });

    // 3. Client disconnect
    this.channel.onDisconnect((reason) => {
      console.log(`[GeminiLive] Client disconnected for session ${this.sessionId}: ${reason}`);
      this.cleanup();
      sessionService.endSession(this.sessionId, 'completed');
    });
  }

  private handleGeminiMessage(rawStr: string): void {
    try {
      const message = JSON.parse(rawStr);

      // 1. Setup Complete
      if (message.setupComplete) {
        console.log(`[GeminiLive] Setup completed successfully for session ${this.sessionId}`);
        this.isSetupComplete = true;
        this.channel.sendControl({
          type: 'setup_complete',
          sessionId: this.sessionId,
          persona: this.persona
        });
        return;
      }

      // 2. Server Content (Audio / Text turns / Interruption)
      if (message.serverContent) {
        const serverContent = message.serverContent;

        // Barge-in / Interruption handling
        if (serverContent.interrupted) {
          console.log(`[GeminiLive] ⚡ Barge-in (interruption) detected on session ${this.sessionId}!`);
          // Clear any partial assistant transcript buffer
          this.assistantTranscriptBuffer = '';
          this.currentTurnAudioBytes = 0;

          // Notify client to immediately stop playing audio buffer
          this.channel.sendControl({
            type: 'interrupted',
            timestamp: new Date().toISOString()
          });
          return;
        }

        // Model Output Parts
        if (serverContent.modelTurn && serverContent.modelTurn.parts) {
          for (const part of serverContent.modelTurn.parts) {
            // Audio output (24kHz 16-bit linear PCM)
            if (part.inlineData && part.inlineData.data) {
              const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
              this.currentTurnAudioBytes += audioBuffer.length;
              this.channel.sendAudio(audioBuffer);
            }

            // Text output (if returned alongside audio)
            if (part.text) {
              this.assistantTranscriptBuffer += part.text;
              this.channel.sendControl({
                type: 'transcript_chunk',
                role: 'assistant',
                text: part.text
              });
            }
          }
        }

        // Turn Complete
        if (serverContent.turnComplete) {
          const finalTranscript = this.assistantTranscriptBuffer.trim();
          const approxDurationMs = Math.round((this.currentTurnAudioBytes / (24000 * 2)) * 1000);

          if (finalTranscript) {
            sessionService.addMessage(this.sessionId, 'assistant', finalTranscript, approxDurationMs);
            this.channel.sendControl({
              type: 'transcript',
              role: 'assistant',
              text: finalTranscript,
              durationMs: approxDurationMs
            });
          }

          // Reset buffers for next turn
          this.assistantTranscriptBuffer = '';
          this.currentTurnAudioBytes = 0;

          this.channel.sendControl({
            type: 'turn_complete',
            timestamp: new Date().toISOString()
          });
        }
      }

      // 3. Usage & Token Metadata
      if (message.usageMetadata) {
        const metadata: GeminiUsageMetadata = message.usageMetadata;
        console.log(`[GeminiLive] Usage metadata received for session ${this.sessionId}: totalTokens=${metadata.totalTokenCount}`);
        sessionService.recordUsage(this.sessionId, metadata);
        this.channel.sendControl({
          type: 'usage',
          usageMetadata: metadata
        });
      }
    } catch (err) {
      console.error(`[GeminiLive] Error handling message on session ${this.sessionId}:`, err);
    }
  }

  public cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
      this.geminiWs.close(1000, 'Session terminated');
      this.geminiWs = null;
    }
    this.isConnected = false;
    this.isSetupComplete = false;
  }
}

export class GeminiLiveProxyService {
  private activeSessions = new Map<string, GeminiLiveSession>();

  public createSession(sessionId: string, channel: AudioChannelAdapter, persona: Persona): GeminiLiveSession {
    const session = new GeminiLiveSession(sessionId, channel, persona);
    this.activeSessions.set(sessionId, session);

    channel.onDisconnect(() => {
      this.activeSessions.delete(sessionId);
    });

    session.connect();
    return session;
  }

  public getSession(sessionId: string): GeminiLiveSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getActiveCount(): number {
    return this.activeSessions.size;
  }
}

export const geminiLiveProxy = new GeminiLiveProxyService();
