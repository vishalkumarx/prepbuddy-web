import React, { useState } from 'react';
import { UserManager } from '../utils/UserManager';

export default function PreparationSelector({ onSelect }) {
  const [selected, setSelected] = useState(null);

  const handleSelect = (mode) => {
    setSelected(mode);
    setTimeout(() => {
      UserManager.setPreparation(mode);
      onSelect(mode);
    }, 400);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-gradient-to-br from-[#0B2457] via-[#1a3a7c] to-[#0B2457] items-center justify-center px-6 py-10">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight mb-1">
          <span className="text-white">Prep</span>
          <span className="text-yellow-400">Buddy</span>
        </h1>
        <p className="text-white/60 text-sm">Your personalised exam companion</p>
      </div>

      {/* Prompt */}
      <div className="w-full max-w-sm">
        <h2 className="text-white text-xl font-bold text-center mb-2">What are you preparing for?</h2>
        <p className="text-white/50 text-sm text-center mb-8">We'll customise your experience based on your goal.</p>

        <div className="space-y-4">
          {/* UPSC Option */}
          <button
            onClick={() => handleSelect('upsc')}
            className={`w-full bg-white/10 border-2 rounded-2xl p-5 text-left transition-all duration-300 active:scale-[0.97] ${
              selected === 'upsc'
                ? 'border-yellow-400 bg-yellow-400/10 scale-[0.98]'
                : 'border-white/20 hover:border-white/50 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                🏛️
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">UPSC</h3>
                <p className="text-white/60 text-sm mt-0.5">Civil Services Examination</p>
                <p className="text-white/40 text-xs mt-1">IAS · IPS · IFS · IRS and more</p>
              </div>
              {selected === 'upsc' && (
                <div className="ml-auto w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-[#0B2457]">✓</span>
                </div>
              )}
            </div>
          </button>

          {/* State Government Option */}
          <button
            onClick={() => handleSelect('state_gov')}
            className={`w-full bg-white/10 border-2 rounded-2xl p-5 text-left transition-all duration-300 active:scale-[0.97] ${
              selected === 'state_gov'
                ? 'border-blue-400 bg-blue-400/10 scale-[0.98]'
                : 'border-white/20 hover:border-white/50 hover:bg-white/15'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-2xl shadow-lg flex-shrink-0">
                🏢
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">State Government</h3>
                <p className="text-white/60 text-sm mt-0.5">State-level Competitive Exams</p>
                <p className="text-white/40 text-xs mt-1">SSC · Railway · State PSC and more</p>
              </div>
              {selected === 'state_gov' && (
                <div className="ml-auto w-6 h-6 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-white">✓</span>
                </div>
              )}
            </div>
          </button>
        </div>

        <p className="text-white/30 text-xs text-center mt-8">
          You can change this anytime from your profile.
        </p>
      </div>
    </div>
  );
}
