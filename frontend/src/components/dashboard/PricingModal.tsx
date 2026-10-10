import React, { useEffect, useState } from 'react';
import { X, Tag, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { api } from '../../lib/api.js';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [pricingConfig, setPricingConfig] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getPricing()
        .then(res => setPricingConfig(res.pricing))
        .catch(err => console.error('Failed to load pricing:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl glass-panel bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-white">
              Configured Gemini Pricing Rates
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-200 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />
                Source: <strong>{pricingConfig?.pricingSource || 'Google AI for Developers'}</strong>
              </span>
              <span className="flex items-center gap-1 font-mono text-indigo-300">
                <Calendar className="w-3.5 h-3.5" />
                Verified: {pricingConfig?.verifiedDate || '2026-10-10'}
              </span>
            </div>
            <p className="text-[11px] text-gray-300">
              Loaded dynamically from <code className="bg-gray-900 px-1 py-0.5 rounded text-indigo-300 font-mono">config/pricing.json</code>. Pricing is decoupled from code and can be edited without rebuilding.
            </p>
          </div>

          {pricingConfig && Object.entries(pricingConfig.models).map(([modelKey, model]: [string, any]) => (
            <div key={modelKey} className="p-4 rounded-xl bg-gray-950 border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-white text-sm">{model.displayName}</span>
                <span className="font-mono text-[11px] text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                  {modelKey}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-400 mb-1.5 text-[11px] uppercase tracking-wider">
                    Input Rates (per 1M tokens)
                  </h4>
                  <ul className="space-y-1 text-gray-300 font-mono text-[11px]">
                    <li className="flex justify-between">
                      <span className="text-gray-400">Audio:</span>
                      <strong className="text-emerald-400">${model.input.AUDIO?.toFixed(2)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Text:</span>
                      <strong className="text-emerald-400">${model.input.TEXT?.toFixed(2)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Image:</span>
                      <strong className="text-emerald-400">${model.input.IMAGE?.toFixed(2)}</strong>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-400 mb-1.5 text-[11px] uppercase tracking-wider">
                    Output Rates (per 1M tokens)
                  </h4>
                  <ul className="space-y-1 text-gray-300 font-mono text-[11px]">
                    <li className="flex justify-between">
                      <span className="text-gray-400">Audio:</span>
                      <strong className="text-emerald-400">${model.output.AUDIO?.toFixed(2)}</strong>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-gray-400">Text:</span>
                      <strong className="text-emerald-400">${model.output.TEXT?.toFixed(2)}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900/60 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
