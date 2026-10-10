import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/common/Navbar.js';
import { VoiceWidget } from './components/widget/VoiceWidget.js';
import { SummaryCards } from './components/dashboard/SummaryCards.js';
import { TrendCharts } from './components/dashboard/TrendCharts.js';
import { SessionsTable } from './components/dashboard/SessionsTable.js';
import { SessionDrawer } from './components/dashboard/SessionDrawer.js';
import { PricingModal } from './components/dashboard/PricingModal.js';
import { AuthModal } from './components/common/AuthModal.js';
import { useDashboardSSE } from './hooks/useDashboardSSE.js';
import { api, clearAuthToken, getAuthToken } from './lib/api.js';
import {
  Code,
  Copy,
  Check,
  RefreshCw,
  Phone,
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<'widget' | 'dashboard'>('widget');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [summary, setSummary] = useState<any | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Check existing session
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      api.getMe()
        .then(res => setCurrentUser(res.user))
        .catch(() => clearAuthToken());
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!getAuthToken()) return;
    setIsLoadingDashboard(true);
    try {
      const [sumRes, trendsRes, sessRes] = await Promise.all([
        api.getSummary(),
        api.getTrends(14),
        api.getSessions({ limit: 50 })
      ]);
      setSummary(sumRes.summary);
      setTrends(trendsRes.trends);
      setSessions(sessRes.sessions);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setIsLoadingDashboard(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      if (currentUser) {
        fetchDashboardData();
      } else {
        setIsLoginOpen(true);
      }
    }
  }, [activeTab, currentUser, fetchDashboardData]);

  // Hook into live Server-Sent Events (SSE)
  const { isConnected: isSseConnected } = useDashboardSSE(
    useCallback(() => {
      // Whenever session event or usage event arrives, sync dashboard
      if (currentUser) {
        fetchDashboardData();
      }
    }, [currentUser, fetchDashboardData])
  );

  const handleLogout = () => {
    clearAuthToken();
    setCurrentUser(null);
    setSummary(null);
    setTrends([]);
    setSessions([]);
  };

  const copyEmbedCode = () => {
    const snippet = `<script src="https://your-domain.com/widget.js"></script>\n<mma-voice-agent persona="persona-general"></mma-voice-agent>`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col text-slate-100">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSseConnected={isSseConnected}
        currentUser={currentUser}
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* TAB 1: Voice Widget & Embed */}
        {activeTab === 'widget' && (
          <div className="space-y-8 animate-fade-in">
            {/* Hero text */}
            <div className="text-center max-w-xl mx-auto mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 border border-indigo-800/40 px-3 py-1 rounded-full inline-flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Multimodal Live API
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Gemini Conversational Voice Agent
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-2">
                Real-time speech-to-speech interaction streamed over WebSockets with 16kHz PCM audio and instant barge-in interruption detection.
              </p>
            </div>

            {/* Embedded Live Widget */}
            <VoiceWidget />

            {/* Callable Service & Telephony Guidance */}
            <div className="max-w-2xl mx-auto glass-panel p-5 rounded-2xl border border-gray-800 text-xs">
              <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 font-semibold text-white">
                  <Code className="w-4 h-4 text-indigo-400" />
                  Deployable as a Callable Service & Telephony Channel
                </div>
                <button
                  type="button"
                  onClick={copyEmbedCode}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-gray-900 border border-gray-800 transition-colors"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSnippet ? 'Copied' : 'Copy Embed Code'}
                </button>
              </div>

              <p className="text-gray-400 leading-relaxed mb-3">
                The agent is decoupled from the UI layer via the abstract <code className="text-indigo-300 font-mono">AudioChannelAdapter</code>. It can be mounted as an embeddable React component, or connected to telephone lines via the included <strong className="text-white">Twilio Media Streams adapter</strong> (resampling 8kHz $\mu$-law to 16kHz PCM).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Web & Mobile Apps</span>
                    <span className="text-gray-400">Direct WebSocket streaming PCM without exposing the server-side Gemini API key.</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-start gap-2">
                  <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">Telephony (Twilio / SIP)</span>
                    <span className="text-gray-400">Inbound/outbound phone calls handled through our TwilioMediaStreamAdapter.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Cost & Usage Analytics Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Dashboard Header Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  Usage & Cost Telemetry
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                    Real-time Logs
                  </span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">
                  Derived directly from Gemini API <code className="text-indigo-300 font-mono">usageMetadata</code> frames with modality token breakdown.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={fetchDashboardData}
                  disabled={isLoadingDashboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDashboard ? 'animate-spin text-indigo-400' : ''}`} />
                  Refresh Metrics
                </button>
              </div>
            </div>

            {/* Unauthenticated State Notice */}
            {!currentUser ? (
              <div className="glass-panel p-10 rounded-2xl border border-gray-800 text-center max-w-md mx-auto my-8">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-base font-semibold text-white mb-2">Admin Authentication Required</h2>
                <p className="text-xs text-gray-400 mb-5">
                  Only authorized team members can view session transcripts and token cost telemetry.
                </p>
                <button
                  type="button"
                  onClick={() => setIsLoginOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-2 transition-all"
                >
                  Sign In with Admin Credentials <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <>
                {/* 1. Summary Cards */}
                <SummaryCards summary={summary} isLoading={isLoadingDashboard} />

                {/* 2. Trend Charts */}
                <TrendCharts trends={trends} isLoading={isLoadingDashboard} />

                {/* 3. Sortable Sessions Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">
                      Recorded Voice Sessions & Transcripts
                    </h2>
                    <span className="text-xs text-gray-500">
                      Click any row to open the complete dialogue & cost audit
                    </span>
                  </div>
                  <SessionsTable
                    sessions={sessions}
                    onSelectSession={setSelectedSessionId}
                    isLoading={isLoadingDashboard}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <SessionDrawer
        sessionId={selectedSessionId}
        onClose={() => setSelectedSessionId(null)}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      <AuthModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          fetchDashboardData();
        }}
      />
    </div>
  );
}
export default App;
