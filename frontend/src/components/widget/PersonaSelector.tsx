import React from 'react';
import { UserCheck, Sparkles, Headphones, ShieldCheck, Briefcase } from 'lucide-react';

interface Persona {
  id: string;
  name: string;
  description: string;
  voiceName: string;
}

interface PersonaSelectorProps {
  personas: Persona[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const VOICE_ICONS: Record<string, React.ReactNode> = {
  Aoede: <Sparkles className="w-4 h-4 text-purple-400" />,
  Puck: <Headphones className="w-4 h-4 text-emerald-400" />,
  Fenrir: <Briefcase className="w-4 h-4 text-amber-400" />,
  Kore: <ShieldCheck className="w-4 h-4 text-blue-400" />
};

export const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  personas,
  selectedId,
  onSelect,
  disabled
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
        Select Agent Persona & Voice
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {personas.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(p.id)}
              className={`p-3 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                  : 'border-gray-800 bg-gray-900/60 text-gray-300 hover:border-gray-700 hover:bg-gray-850'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-medium text-sm text-gray-100 flex items-center gap-1.5">
                  {VOICE_ICONS[p.voiceName] || <UserCheck className="w-4 h-4 text-indigo-400" />}
                  {p.name.split(' - ')[0]}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                  Voice: {p.voiceName}
                </span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-1">{p.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
