import React, { useEffect, useState } from 'react';
import {
  X,
  Clock,
  DollarSign,
  Cpu,
  Headphones,
  FileText,
  User,
  Bot,
  Activity,
  Code2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../../lib/api.js';

interface SessionDrawerProps {
  sessionId: string | null;
  onClose: () => void;
}

export const SessionDrawer: React.FC<SessionDrawerProps> = ({ sessionId, onClose }) => {
  const [data, setData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setIsLoading(true);
    api.getSessionDetails(sessionId)
      .then(res => setData(res))
      .catch(err => console.error('Failed to load session details:', err))
      .finally(() => setIsLoading(false));
  }, [sessionId]);

  if (!sessionId) return null;

  const session = data?.session;
  const persona = data?.persona;
  const messages = data?.messages || [];
  const usageEvents = data?.usageEvents || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0F172A] border-l border-gray-800 h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-2 py-0.5 rounded">
                {sessionId.substring(0, 13)}...
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium uppercase border ${
                session?.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-gray-800 text-gray-300 border-gray-700'
              }`}>
                {session?.status || 'loading'}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white mt-1">
              Session Telemetry & Audit
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !session ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-28 bg-gray-900 rounded-xl" />
              <div className="h-44 bg-gray-900 rounded-xl" />
            </div>
          ) : session ? (
            <>
              {/* Cost & Token Breakdown Card */}
              <div className="glass-panel p-5 rounded-2xl border border-gray-800">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Exact Cost & Modality Calculation
                  </h3>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    ${Number(session.total_cost_usd).toFixed(6)} USD
                  </div>
                </div>

                {/* Modality Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1.5 mb-1 text-[11px]">
                      <Headphones className="w-3.5 h-3.5 text-purple-400" />
                      Audio Input (Prompt)
                    </span>
                    <div className="font-mono text-white text-sm font-semibold">
                      {session.prompt_tokens_audio.toLocaleString()} <span className="text-[10px] text-gray-500">tokens</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Rate: $3.00 / 1M = <strong className="text-purple-300 font-mono">${((session.prompt_tokens_audio * 3.00) / 1e6).toFixed(6)}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1.5 mb-1 text-[11px]">
                      <Headphones className="w-3.5 h-3.5 text-purple-400" />
                      Audio Output (Speech)
                    </span>
                    <div className="font-mono text-white text-sm font-semibold">
                      {session.candidates_tokens_audio.toLocaleString()} <span className="text-[10px] text-gray-500">tokens</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Rate: $12.00 / 1M = <strong className="text-purple-300 font-mono">${((session.candidates_tokens_audio * 12.00) / 1e6).toFixed(6)}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1.5 mb-1 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Text Input (System Prompt)
                    </span>
                    <div className="font-mono text-white text-sm font-semibold">
                      {session.prompt_tokens_text.toLocaleString()} <span className="text-[10px] text-gray-500">tokens</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Rate: $0.75 / 1M = <strong className="text-blue-300 font-mono">${((session.prompt_tokens_text * 0.75) / 1e6).toFixed(6)}</strong>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800">
                    <span className="text-gray-400 flex items-center gap-1.5 mb-1 text-[11px]">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Text Output (Transcripts)
                    </span>
                    <div className="font-mono text-white text-sm font-semibold">
                      {session.candidates_tokens_text.toLocaleString()} <span className="text-[10px] text-gray-500">tokens</span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">
                      Rate: $4.50 / 1M = <strong className="text-blue-300 font-mono">${((session.candidates_tokens_text * 4.50) / 1e6).toFixed(6)}</strong>
                    </div>
                  </div>
                </div>

                {/* Mathematical Equation Box */}
                <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 font-mono text-[11px] text-gray-300">
                  <div className="text-gray-500 mb-1 font-sans text-[10px] uppercase tracking-wider">
                    Formula Execution:
                  </div>
                  Total Cost = (Tokens<sub>AudioIn</sub> × $3.00 + Tokens<sub>AudioOut</sub> × $12.00 + Tokens<sub>TextIn</sub> × $0.75 + Tokens<sub>TextOut</sub> × $4.50) ÷ 1,000,000
                </div>
              </div>

              {/* Persona & Metadata Details */}
              <div className="glass-panel p-4 rounded-xl border border-gray-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Agent Persona:</span>
                  <span className="text-white font-medium">{session.persona_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Underlying Model:</span>
                  <span className="text-indigo-400 font-mono">{session.model_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white font-mono">{Math.round(session.duration_seconds)} seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Tokens:</span>
                  <span className="text-white font-mono">{session.total_tokens.toLocaleString()}</span>
                </div>
              </div>

              {/* Full Conversation Transcript */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Recorded Transcripts ({messages.length})
                </h3>

                {messages.length === 0 ? (
                  <div className="p-4 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-500 text-center italic">
                    No transcript recorded for this session yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((m: any) => (
                      <div
                        key={m.id}
                        className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-indigo-950/30 border-indigo-800/40 text-indigo-100 ml-8'
                            : 'bg-gray-900/80 border-gray-800 text-gray-200 mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1.5">
                          <span className="font-semibold flex items-center gap-1 text-gray-400">
                            {m.role === 'user' ? <User className="w-3 h-3 text-indigo-400" /> : <Bot className="w-3 h-3 text-emerald-400" />}
                            {m.role === 'user' ? 'User Speech' : (session.persona_name || 'Agent')}
                          </span>
                          <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p>{m.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Raw Usage Events Accordion */}
              <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/40">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-4 py-3 flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-gray-500" />
                    Inspect Raw Usage Events ({usageEvents.length})
                  </span>
                  {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showRawJson && (
                  <div className="p-4 border-t border-gray-800 bg-gray-950 max-h-60 overflow-y-auto">
                    <pre className="text-[11px] font-mono text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(usageEvents, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
