import React, { useState } from 'react';
import {
  ArrowUpDown,
  Search,
  Filter,
  CheckCircle2,
  Activity,
  AlertCircle,
  Eye,
  ChevronRight,
  Headphones,
  FileText
} from 'lucide-react';

interface SessionItem {
  id: string;
  persona_id: string;
  persona_name: string;
  status: 'active' | 'completed' | 'error';
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
  model_name: string;
  prompt_tokens_text: number;
  prompt_tokens_audio: number;
  candidates_tokens_text: number;
  candidates_tokens_audio: number;
  total_tokens: number;
  total_cost_usd: number;
}

interface SessionsTableProps {
  sessions: SessionItem[];
  onSelectSession: (id: string) => void;
  isLoading?: boolean;
}

function formatDuration(sec: number): string {
  if (!sec || sec < 60) return `${Math.round(sec || 0)}s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m ${s}s`;
}

export const SessionsTable: React.FC<SessionsTableProps> = ({
  sessions,
  onSelectSession,
  isLoading
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'error'>('all');
  const [sortField, setSortField] = useState<string>('started_at');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Filter sessions
  const filtered = sessions.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.persona_name && s.persona_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort sessions
  const sorted = [...filtered].sort((a: any, b: any) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal || 0) - (bVal || 0) : (bVal || 0) - (aVal || 0);
  });

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search session ID or persona..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-xl border border-gray-800 text-xs">
            {(['all', 'active', 'completed', 'error'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Showing <strong className="text-white">{sorted.length}</strong> of {sessions.length} sessions
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-900/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold">
            <tr>
              <th className="py-3 px-4">Status</th>
              <th
                onClick={() => toggleSort('started_at')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Started At
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Persona</th>
              <th
                onClick={() => toggleSort('duration_seconds')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Duration
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Audio Tokens</th>
              <th className="py-3 px-4">Text Tokens</th>
              <th
                onClick={() => toggleSort('total_tokens')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Total Tokens
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('total_cost_usd')}
                className="py-3 px-4 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  Cost ($ USD)
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {sorted.map((s) => {
              const audioTokens = s.prompt_tokens_audio + s.candidates_tokens_audio;
              const textTokens = s.prompt_tokens_text + s.candidates_tokens_text;
              return (
                <tr
                  key={s.id}
                  onClick={() => onSelectSession(s.id)}
                  className="hover:bg-gray-850/60 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      s.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : s.status === 'completed'
                        ? 'bg-gray-800 text-gray-300 border-gray-700'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {s.status === 'active' && <Activity className="w-3 h-3 animate-pulse text-emerald-400" />}
                      {s.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {s.status === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                      {s.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-300">
                    {new Date(s.started_at).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-white font-medium">
                    {s.persona_name || 'Nova Assistant'}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-300">
                    {formatDuration(s.duration_seconds)}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-purple-300">
                    <span className="flex items-center gap-1">
                      <Headphones className="w-3 h-3 text-purple-400" />
                      {audioTokens.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-blue-300">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-blue-400" />
                      {textTokens.toLocaleString()}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono text-gray-200">
                    {s.total_tokens.toLocaleString()}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-emerald-400">
                    ${Number(s.total_cost_usd || 0).toFixed(4)}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="p-1 rounded-lg text-gray-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors"
                      title="Inspect Session & Transcript"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}

            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-500 italic">
                  No sessions found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
