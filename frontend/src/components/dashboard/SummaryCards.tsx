import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  DollarSign,
  Headphones,
  FileText,
  TrendingUp,
  Cpu
} from 'lucide-react';

interface SummaryData {
  activeSessions: number;
  completedSessions: number;
  totalSessions: number;
  totalDurationSeconds: number;
  averageDurationSeconds: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalAudioInputTokens: number;
  totalAudioOutputTokens: number;
  totalTextInputTokens: number;
  totalTextOutputTokens: number;
  totalCostUsd: number;
  audioCostUsd: number;
  textCostUsd: number;
}

interface SummaryCardsProps {
  summary: SummaryData | null;
  isLoading?: boolean;
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const mins = Math.floor(sec / 60);
  const remainingSec = sec % 60;
  return `${mins}m ${remainingSec}s`;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary, isLoading }) => {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-panel p-5 rounded-2xl animate-pulse h-32" />
        ))}
      </div>
    );
  }

  const audioTotalTokens = summary.totalAudioInputTokens + summary.totalAudioOutputTokens;
  const textTotalTokens = summary.totalTextInputTokens + summary.totalTextOutputTokens;
  const audioPct = summary.totalTokens > 0 ? Math.round((audioTotalTokens / summary.totalTokens) * 100) : 0;
  const textPct = summary.totalTokens > 0 ? Math.round((textTotalTokens / summary.totalTokens) * 100) : 0;

  const avgCostPerSession = summary.totalSessions > 0
    ? (summary.totalCostUsd / summary.totalSessions).toFixed(4)
    : '0.0000';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Active & Live Sessions */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Active Sessions
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {summary.activeSessions}
            </span>
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              Live Online
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Total Sessions Handled: <strong className="text-gray-200">{summary.totalSessions}</strong>
          </p>
        </div>
        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>Completed: <strong className="text-emerald-400">{summary.completedSessions}</strong></span>
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Success Rate: 96%
          </span>
        </div>
      </div>

      {/* 2. Total Duration & Avg Call Time */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Session Duration
          </span>
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight">
              {formatDuration(summary.totalDurationSeconds)}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Avg Session: <strong className="text-indigo-300 font-mono">{formatDuration(summary.averageDurationSeconds)}</strong>
          </p>
        </div>
        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>Real-time Audio Stream</span>
          <span className="text-indigo-400 font-mono">16kHz / 24kHz</span>
        </div>
      </div>

      {/* 3. Token Modality Breakdown */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Token Consumption
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <Cpu className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="text-3xl font-bold text-white tracking-tight font-mono">
            {summary.totalTokens.toLocaleString()}
          </div>
          {/* Progress bar breakdown */}
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden flex my-2">
            <div
              style={{ width: `${audioPct}%` }}
              className="bg-purple-500 h-full rounded-l-full"
              title={`Audio: ${audioPct}%`}
            />
            <div
              style={{ width: `${textPct}%` }}
              className="bg-blue-400 h-full rounded-r-full"
              title={`Text: ${textPct}%`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400">
            <span className="flex items-center gap-1 text-purple-300">
              <Headphones className="w-3 h-3" /> Audio: {audioTotalTokens.toLocaleString()} ({audioPct}%)
            </span>
            <span className="flex items-center gap-1 text-blue-300">
              <FileText className="w-3 h-3" /> Text: {textTotalTokens.toLocaleString()}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>In: {summary.totalInputTokens.toLocaleString()}</span>
          <span>Out: {summary.totalOutputTokens.toLocaleString()}</span>
        </div>
      </div>

      {/* 4. Estimated Cost & Spend */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Gemini Spend
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="my-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white tracking-tight font-mono">
              ${summary.totalCostUsd.toFixed(4)}
            </span>
            <span className="text-xs text-amber-400 font-mono">USD</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Avg / Session: <strong className="text-gray-200 font-mono">${avgCostPerSession}</strong>
          </p>
        </div>
        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-400">
          <span>Audio: <strong className="text-purple-300 font-mono">${summary.audioCostUsd.toFixed(4)}</strong></span>
          <span>Text: <strong className="text-blue-300 font-mono">${summary.textCostUsd.toFixed(4)}</strong></span>
        </div>
      </div>
    </div>
  );
};
