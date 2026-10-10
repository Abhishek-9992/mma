import React from 'react';
import {
  Volume2,
  BarChart2,
  Radio,
  Tag,
  LogOut,
  LogIn,
  Shield,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'widget' | 'dashboard';
  setActiveTab: (tab: 'widget' | 'dashboard') => void;
  isSseConnected: boolean;
  currentUser: any | null;
  onOpenPricing: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSseConnected,
  currentUser,
  onOpenPricing,
  onOpenLogin,
  onLogout
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-800/80 bg-[#0B0F19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">
                Gemini Voice Agent
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Live API
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Speech-to-Speech & Cost Analytics Hub
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center p-1 rounded-xl bg-gray-900 border border-gray-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('widget')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'widget'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            Voice Widget
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-indigo-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Cost & Usage Dashboard
          </button>
        </div>

        {/* Right Tools & Auth */}
        <div className="flex items-center gap-3">
          {/* Pricing Button */}
          <button
            type="button"
            onClick={onOpenPricing}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-800 text-gray-300 text-xs transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-indigo-400" />
            API Pricing
          </button>

          {/* SSE Live Status Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-[11px]">
            <span className={`w-2 h-2 rounded-full ${
              isSseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
            }`} />
            <span className="text-gray-400 hidden sm:inline">
              {isSseConnected ? 'SSE Live' : 'Polling'}
            </span>
          </div>

          {/* Auth Controls */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-300 font-medium hidden lg:flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {currentUser.username}
              </span>
              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-medium transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              Admin Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
