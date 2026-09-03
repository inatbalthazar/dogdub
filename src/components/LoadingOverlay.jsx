import React from 'react';
import { Loader2, Sparkles, Film, Disc } from 'lucide-react';

export default function LoadingOverlay({
  isOpen = false,
  percent = 0,
  title = "Loading...",
  subtext = "Please wait a moment",
}) {
  if (!isOpen) return null;

  const validPercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl border border-[var(--cyan)]/40 bg-gradient-to-b from-[oklch(20%_0.02_195)] to-[oklch(12%_0.01_190)] p-6 text-center shadow-2xl glow-cyan flex flex-col items-center justify-center gap-4">
        {/* Glowing Spinning Wheel Icon */}
        <div className="relative flex items-center justify-center my-2">
          {/* Outer Cyan Spinner */}
          <div className="h-24 w-24 rounded-full border-4 border-t-[var(--cyan)] border-r-transparent border-b-[var(--cyan)]/30 border-l-transparent animate-spin shadow-[0_0_20px_rgba(0,243,255,0.4)]" />
          
          {/* Inner Amber Spinner */}
          <div className="absolute h-16 w-16 rounded-full border-4 border-t-transparent border-r-[var(--amber)] border-b-transparent border-l-[var(--amber)]/30 animate-spin-slow" />
          
          {/* Center % Text */}
          <div className="absolute inset-0 flex items-center justify-center font-['Outfit'] font-black text-white text-xl drop-shadow-[0_0_10px_rgba(0,243,255,0.8)]">
            <span>{validPercent}%</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full">
          <div className="h-3 w-full overflow-hidden rounded-full border border-[var(--cyan)]/30 bg-black/60 p-0.5 shadow-inner">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-[var(--cyan)] to-emerald-400 transition-all duration-300 shadow-[0_0_12px_rgba(0,243,255,0.6)]"
              style={{ width: `${validPercent}%` }}
            />
          </div>
        </div>

        {/* Title & Subtext */}
        <div>
          <h3 className="font-['Bowlby_One_SC'] text-base text-white tracking-wide flex items-center justify-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--amber)] animate-bounce" />
            <span>{title}</span>
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {subtext}
          </p>
        </div>
      </div>
    </div>
  );
}
