import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface TrendPoint {
  date: string;
  sessionCount: number;
  totalCostUsd: number;
  audioTokens: number;
  textTokens: number;
  totalTokens: number;
  durationSeconds: number;
}

interface TrendChartsProps {
  trends: TrendPoint[];
  isLoading?: boolean;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ trends, isLoading }) => {
  if (isLoading || trends.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="glass-panel p-5 rounded-2xl h-80 animate-pulse" />
        <div className="glass-panel p-5 rounded-2xl h-80 animate-pulse" />
      </div>
    );
  }

  // Format date labels (e.g. "10/05")
  const formattedData = trends.map(item => ({
    ...item,
    formattedDate: item.date.length >= 10 ? item.date.substring(5) : item.date,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* 1. Daily API Spend ($ USD) */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Daily Spend Trend ($ USD)
            </h3>
            <p className="text-xs text-gray-400">Calculated in real-time from Gemini token rates</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40">
            Last 14 Days
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="formattedDate" stroke="#6b7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(val) => `$${val}`} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
                formatter={(value: any) => [`$${Number(value).toFixed(4)}`, 'Spend']}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="totalCostUsd"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#spendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Modality Token Distribution (Audio vs Text) */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              Token Modality Breakdown
            </h3>
            <p className="text-xs text-gray-400">Audio tokens vs Text tokens per day</p>
          </div>
          <span className="text-xs font-mono text-purple-400 px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-800/40">
            Stacked
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="formattedDate" stroke="#6b7280" fontSize={11} tickLine={false} />
              <YAxis stroke="#6b7280" fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  borderColor: '#374151',
                  borderRadius: '0.75rem',
                  fontSize: '12px'
                }}
                formatter={(val: any) => [Number(val).toLocaleString(), 'Tokens']}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="audioTokens" name="Audio Tokens" stackId="a" fill="#818cf8" radius={[0, 0, 0, 0]} />
              <Bar dataKey="textTokens" name="Text Tokens" stackId="a" fill="#38bdf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
