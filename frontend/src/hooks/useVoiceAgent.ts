import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioStreamPlayer, convertTo16kHzPcm } from '../lib/audioUtils.js';

export type AgentStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'error';

export interface TranscriptItem {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export function useVoiceAgent() {
  const [status, setStatus] = useState<AgentStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [currentAssistantText, setCurrentAssistantText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveUsage, setLiveUsage] = useState<any>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const playerRef = useRef<AudioStreamPlayer>(new AudioStreamPlayer());
  const micContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const isMutedRef = useRef(false);
  const sendTimeRef = useRef<number>(0);

  isMutedRef.current = isMuted;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endSession();
    };
  }, []);

  const endSession = useCallback(() => {
    // 1. Stop mic
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (micContextRef.current && micContextRef.current.state !== 'closed') {
      micContextRef.current.close();
      micContextRef.current = null;
    }

    // 2. Stop audio playback
    if (playerRef.current) {
      playerRef.current.flush();
    }

    // 3. Close WS
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'User ended call');
      }
      wsRef.current = null;
    }

    setStatus('idle');
  }, []);

  const startSession = useCallback(async (personaId?: string) => {
    setError(null);
    setStatus('connecting');
    setTranscripts([]);
    setCurrentAssistantText('');

    try {
      // 1. Initialize Microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      micStreamRef.current = stream;

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const micCtx = new AudioCtxClass();
      micContextRef.current = micCtx;
      const sourceNode = micCtx.createMediaStreamSource(stream);

      // ScriptProcessor for PCM audio chunking
      const processor = micCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (isMutedRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Downsample to 16kHz linear PCM
        const pcm16Buffer = convertTo16kHzPcm(inputData, micCtx.sampleRate);

        sendTimeRef.current = performance.now();
        // Send binary frame over WebSocket
        wsRef.current.send(pcm16Buffer);
      };

      sourceNode.connect(processor);
      processor.connect(micCtx.destination);

      // 2. Initialize Player AudioContext
      playerRef.current.init();

      // 3. Connect WebSocket
      let wsUrl = import.meta.env.VITE_WS_BASE_URL || '';
      if (!wsUrl) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws/voice`;
      }
      wsUrl += `${wsUrl.includes('?') ? '&' : '?'}${personaId ? `personaId=${personaId}` : ''}`;

      console.log(`[useVoiceAgent] Connecting to ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('[useVoiceAgent] WebSocket connection established');
      };

      ws.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          // Received 24kHz PCM Audio Chunk from Gemini
          if (sendTimeRef.current > 0) {
            setLatencyMs(Math.round(performance.now() - sendTimeRef.current));
            sendTimeRef.current = 0;
          }
          setStatus('speaking');
          playerRef.current.playChunk(event.data);
        } else {
          // JSON Control message
          try {
            const msg = JSON.parse(event.data);

            if (msg.type === 'setup_complete') {
              setStatus('listening');
              setSessionId(msg.sessionId);
              setActivePersona(msg.persona);
            } else if (msg.type === 'interrupted') {
              console.log('[useVoiceAgent] ⚡ Barge-in interruption triggered: clearing buffer!');
              playerRef.current.flush();
              setCurrentAssistantText('');
              setStatus('listening');
            } else if (msg.type === 'transcript_chunk') {
              setCurrentAssistantText(prev => prev + msg.text);
              setStatus('speaking');
            } else if (msg.type === 'transcript') {
              setTranscripts(prev => [
                ...prev,
                {
                  id: Math.random().toString(),
                  role: msg.role,
                  text: msg.text,
                  timestamp: new Date().toLocaleTimeString()
                }
              ]);
              if (msg.role === 'assistant') {
                setCurrentAssistantText('');
                setStatus('listening');
              }
            } else if (msg.type === 'turn_complete') {
              setStatus('listening');
            } else if (msg.type === 'usage') {
              setLiveUsage(msg.usageMetadata);
            } else if (msg.type === 'error') {
              setError(msg.error || 'Gemini error');
              setStatus('error');
            }
          } catch (err) {
            console.error('[useVoiceAgent] Error parsing control event:', err);
          }
        }
      };

      ws.onerror = (e) => {
        console.error('[useVoiceAgent] WebSocket error:', e);
        setError('Voice connection encountered an error.');
        setStatus('error');
      };

      ws.onclose = (e) => {
        console.log(`[useVoiceAgent] WebSocket closed (${e.code})`);
        endSession();
      };

    } catch (err: any) {
      console.error('[useVoiceAgent] Failed to initialize voice session:', err);
      setError(err.message || 'Microphone access denied or network error.');
      setStatus('error');
      endSession();
    }
  }, [endSession]);

  const sendTextMessage = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'text', text }));
    setTranscripts(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        role: 'user',
        text,
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    status,
    isMuted,
    transcripts,
    currentAssistantText,
    error,
    activePersona,
    sessionId,
    liveUsage,
    latencyMs,
    analyser: playerRef.current.getAnalyser(),
    startSession,
    endSession,
    sendTextMessage,
    toggleMute
  };
}
