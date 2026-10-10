import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Volume2,
  Sparkles,
  Zap,
  Send,
  MessageSquare,
  Activity,
  AlertCircle
} from 'lucide-react';
import { useVoiceAgent } from '../../hooks/useVoiceAgent.js';
import { PersonaSelector } from './PersonaSelector.js';
import { AudioVisualizer } from './AudioVisualizer.js';
import { api } from '../../lib/api.js';

interface VoiceWidgetProps {
  isEmbed?: boolean;
}

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({ isEmbed = false }) => {
  const [personas, setPersonas] = useState<any[]>([]);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('persona-general');
  const [textInput, setTextInput] = useState('');
  const [showTranscripts, setShowTranscripts] = useState(true);

  const transcriptsEndRef = useRef<HTMLDivElement | null>(null);

  const {
    status,
    isMuted,
    transcripts,
    currentAssistantText,
    error,
    activePersona,
    latencyMs,
    analyser,
    startSession,
    endSession,
    sendTextMessage,
    toggleMute
  } = useVoiceAgent();

  useEffect(() => {
    api.getPersonas()
      .then(res => {
        setPersonas(res.personas);
        const def = res.personas.find(p => p.is_default) || res.personas[0];
        if (def) setSelectedPersonaId(def.id);
      })
      .catch(err => console.error('Failed to load personas:', err));
  }, []);

  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, currentAssistantText]);

  const handleStartCall = () => {
    startSession(selectedPersonaId);
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || status === 'idle' || status === 'connecting') return;
    sendTextMessage(textInput.trim());
    setTextInput('');
  };

  const isCallActive = status !== 'idle';

  return (
    <div className={`w-full max-w-2xl mx-auto glass-panel rounded-2xl border border-gray-800 shadow-2xl overflow-hidden ${isEmbed ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Volume2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              Gemini Live Voice Agent
              <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                Bidirectional PCM
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Low-latency speech-to-speech with natural barge-in turn-taking
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {latencyMs !== null && isCallActive && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-1 rounded-md">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
              {latencyMs}ms
            </div>
          )}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            status === 'speaking'
              ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/40 animate-pulse'
              : status === 'listening'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/40'
              : status === 'connecting'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/40 animate-pulse'
              : status === 'error'
              ? 'bg-rose-500/10 text-rose-300 border-rose-500/40'
              : 'bg-gray-800/70 text-gray-400 border-gray-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              status === 'speaking' ? 'bg-indigo-400' :
              status === 'listening' ? 'bg-emerald-400' :
              status === 'connecting' ? 'bg-amber-400' :
              status === 'error' ? 'bg-rose-400' : 'bg-gray-500'
            }`} />
            {status === 'speaking' && 'Speaking (Assistant)'}
            {status === 'listening' && 'Listening (Say anything)'}
            {status === 'connecting' && 'Connecting to Gemini...'}
            {status === 'error' && 'Error'}
            {status === 'idle' && 'Ready to Connect'}
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Persona Selector (disabled during call) */}
      <div className="mb-5">
        <PersonaSelector
          personas={personas}
          selectedId={selectedPersonaId}
          onSelect={setSelectedPersonaId}
          disabled={isCallActive}
        />
      </div>

      {/* Active Persona Banner */}
      {activePersona && isCallActive && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-gray-900/80 border border-gray-800 flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Active Persona: <strong className="text-white">{activePersona.name}</strong></span>
          </div>
          <span className="text-gray-400">Voice: <strong className="text-indigo-300">{activePersona.voiceName}</strong></span>
        </div>
      )}

      {/* Central Visualizer & Call Hub */}
      <div className="relative rounded-2xl bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-800/80 p-6 flex flex-col items-center justify-center my-4 overflow-hidden">
        {/* Glowing Orb Animation */}
        <div className="relative mb-3 flex items-center justify-center">
          {status === 'speaking' && (
            <div className="absolute w-28 h-28 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          )}
          {status === 'listening' && (
            <div className="absolute w-28 h-28 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          )}

          <div className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all duration-300 shadow-xl ${
            status === 'speaking'
              ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 border-indigo-400 text-white shadow-indigo-500/30 scale-105'
              : status === 'listening'
              ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 border-emerald-400 text-white shadow-emerald-500/30'
              : status === 'connecting'
              ? 'bg-gradient-to-tr from-amber-600 to-amber-500 border-amber-400 text-white animate-pulse'
              : 'bg-gray-800 border-gray-700 text-gray-400'
          }`}>
            <Activity className={`w-9 h-9 ${status === 'speaking' ? 'animate-bounce' : ''}`} />
          </div>
        </div>

        {/* Live Audio Visualizer Spectrum */}
        <AudioVisualizer
          analyser={analyser}
          isActive={status === 'speaking' || status === 'listening'}
          status={status}
        />

        {/* Real-time speech tip / barge-in info */}
        <p className="text-xs text-gray-400 mt-2 text-center">
          {status === 'speaking'
            ? '💡 Barge-in enabled: speak at any moment to interrupt the agent.'
            : status === 'listening'
            ? 'Speak clearly into your microphone — streaming 16kHz PCM.'
            : status === 'connecting'
            ? 'Handshaking with Gemini Live multimodal protocol...'
            : 'Press Start Voice Session to speak in real-time.'}
        </p>

        {/* Action Controls */}
        <div className="flex items-center gap-4 mt-5">
          {!isCallActive ? (
            <button
              type="button"
              onClick={handleStartCall}
              className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <PhoneCall className="w-4 h-4" />
              Start Voice Session
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleMute}
                className={`p-3 rounded-full border transition-all ${
                  isMuted
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750'
                }`}
                title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={endSession}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-sm shadow-lg shadow-rose-600/25 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <PhoneOff className="w-4 h-4" />
                End Call
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Transcripts Stream */}
      <div className="mt-4 border border-gray-800 rounded-xl bg-gray-950/60 overflow-hidden">
        <div
          onClick={() => setShowTranscripts(!showTranscripts)}
          className="px-4 py-2.5 bg-gray-900/60 flex items-center justify-between cursor-pointer border-b border-gray-800/80"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-300">
            <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
            Live Conversation Transcript ({transcripts.length})
          </div>
          <span className="text-[11px] text-gray-500 hover:text-gray-300">
            {showTranscripts ? 'Collapse' : 'Expand'}
          </span>
        </div>

        {showTranscripts && (
          <div className="p-4 max-h-52 overflow-y-auto space-y-3 text-xs">
            {transcripts.length === 0 && !currentAssistantText && (
              <p className="text-gray-500 text-center py-4 italic">
                Transcripts will stream in real-time as you and the agent converse.
              </p>
            )}

            {transcripts.map((t) => (
              <div
                key={t.id}
                className={`flex flex-col ${t.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-gray-500">
                  <span>{t.role === 'user' ? 'You' : (activePersona?.name || 'Agent')}</span>
                  <span>•</span>
                  <span>{t.timestamp}</span>
                </div>
                <div className={`p-2.5 rounded-xl max-w-[85%] leading-relaxed ${
                  t.role === 'user'
                    ? 'bg-indigo-600/30 border border-indigo-500/30 text-indigo-100 rounded-tr-none'
                    : 'bg-gray-900 border border-gray-800 text-gray-200 rounded-tl-none'
                }`}>
                  {t.text}
                </div>
              </div>
            ))}

            {/* In-flight streaming response */}
            {currentAssistantText && (
              <div className="flex flex-col items-start animate-fade-in">
                <div className="flex items-center gap-1.5 mb-1 text-[10px] text-indigo-400">
                  <span>{activePersona?.name || 'Agent'}</span>
                  <span>(streaming speech...)</span>
                </div>
                <div className="p-2.5 rounded-xl max-w-[85%] leading-relaxed bg-gray-900 border border-indigo-500/30 text-gray-200 rounded-tl-none">
                  {currentAssistantText}
                  <span className="inline-block w-1.5 h-3 ml-1 bg-indigo-400 animate-pulse" />
                </div>
              </div>
            )}
            <div ref={transcriptsEndRef} />
          </div>
        )}
      </div>

      {/* Text Prompt injection fallback */}
      {isCallActive && (
        <form onSubmit={handleSendText} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type text turn (optional fallback for microphone)..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
};
