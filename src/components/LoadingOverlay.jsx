import React from 'react';
import { Sparkles, Radio, Film, Volume2 } from 'lucide-react';

export default function LoadingOverlay({
  isOpen = false,
  percent = 0,
  title = "Loading...",
  subtext = "Please wait a moment",
}) {
  if (!isOpen) return null;

  const validPercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-view-enter">
      <div className="relative w-full max-w-sm rounded-3xl border border-[oklch(42%_0.02_195)] bg-gradient-to-b from-[oklch(20%_0.015_195)] to-[oklch(12%_0.01_190)] p-7 text-center shadow-2xl animate-modal-pop flex flex-col items-center justify-center gap-5">
        
        {/* Dynamic Multi-Ring Spinner + Centered Percent */}
        <div className="relative flex items-center justify-center my-1">
          {/* Outer Clockwise Tech Ring */}
          <div className="h-28 w-28 rounded-full border-4 border-t-[var(--cyan)] border-r-transparent border-b-[oklch(40%_0.08_205)] border-l-transparent animate-spin" />
          
          {/* Inner Counter-Clockwise Accent Ring */}
          <div className="absolute h-20 w-20 rounded-full border-4 border-t-transparent border-r-[var(--amber)] border-b-transparent border-l-[oklch(45%_0.08_83)] animate-spin-reverse" />
          
          {/* Pulsing Concentric Mic Node */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-['Outfit'] font-black text-white text-2xl tracking-tight">
              {validPercent}%
            </span>
          </div>
        </div>

        {/* Equalizer Waveform Motion Indicator */}
        <div className="flex items-end justify-center gap-1.5 h-6">
          <div className="w-1.5 bg-[var(--cyan)] rounded-full animate-eq-1" />
          <div className="w-1.5 bg-[var(--amber)] rounded-full animate-eq-2" />
          <div className="w-1.5 bg-emerald-400 rounded-full animate-eq-3" />
          <div className="w-1.5 bg-sky-400 rounded-full animate-eq-4" />
          <div className="w-1.5 bg-[var(--cyan)] rounded-full animate-eq-2" />
        </div>

        {/* Shimmering Progress Bar */}
        <div className="w-full">
          <div className="h-3.5 w-full overflow-hidden rounded-full border border-[oklch(35%_0.015_190)] bg-black/70 p-0.5 shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] via-emerald-400 to-[var(--amber)] transition-all duration-300 relative overflow-hidden"
              style={{ width: `${validPercent}%` }}
            >
              <div className="absolute inset-0 bg-shimmer" />
            </div>
          </div>
        </div>

        {/* Title & Subtext with Staggered Entrance */}
        <div className="space-y-1">
          <h3 className="font-['Bowlby_One_SC'] text-base text-white tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--amber)] animate-bounce" />
            <span>{title}</span>
          </h3>
          <p className="text-xs font-medium text-cyan-200/90 font-mono tracking-wide">
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
}
