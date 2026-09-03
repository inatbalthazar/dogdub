import React from 'react';
import { HelpCircle, LogOut, User, Edit3, Globe } from 'lucide-react';

export default function Header({ 
  packs = [], 
  selectedPackId, 
  onSelectPack, 
  activeRoom, 
  playerName = 'Player',
  onOpenEditNameModal,
  onOpenHowToPlayModal,
  onLeaveRoom,
  lang = 'en',
  onToggleLang,
  t = {}
}) {
  return (
    <header className="sticky top-0 z-40 flex min-h-[64px] items-center justify-between border-b border-[var(--cyan)]/30 bg-[oklch(12%_0.01_190)]/90 px-4 md:px-6 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-3">
        <a href="#" className="flex items-center gap-3 text-white no-underline group">
          <div className="relative flex items-center justify-center">
            <img 
              src="/favicon.png" 
              alt="DOGDUB" 
              className="h-9 w-auto max-h-9 flex-shrink-0 object-contain drop-shadow-[0_0_12px_rgba(0,243,255,0.4)] transition-transform duration-300 group-hover:scale-105" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-['Bowlby_One_SC'] text-lg md:text-xl tracking-wider text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              DOG<i className="not-italic text-[var(--cyan)] drop-shadow-[0_0_8px_rgba(0,243,255,0.8)]">DUB</i>
            </span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[var(--muted)] -mt-1 hidden sm:block">
              VOICE DUBBING STUDIO
            </span>
          </div>
        </a>
      </div>

      {/* Player Name Badge & Language Toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenEditNameModal}
          className="flex items-center gap-2 rounded-xl border border-[var(--cyan)]/40 bg-black/50 px-3 md:px-4 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(0,243,255,0.1)] transition-all duration-300 hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/15 hover:shadow-[0_0_20px_rgba(0,243,255,0.3)] active:scale-95"
          title={t.editNameTooltip || "Click to change player name"}
          type="button"
        >
          <User className="h-4 w-4 text-[var(--cyan)]" />
          <span className="text-[var(--muted)] hidden sm:inline">{t.playerLabel || "Player:"}</span>
          <span className="font-extrabold text-white max-w-[100px] sm:max-w-[160px] truncate">{playerName}</span>
          <Edit3 className="h-3.5 w-3.5 text-gray-400" />
        </button>

        {/* Language Selector Button */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--cyan)]/50 bg-black/60 px-3 py-1.5 text-xs font-extrabold text-[var(--cyan)] shadow-[0_0_12px_rgba(0,243,255,0.15)] transition-all duration-300 hover:bg-[var(--cyan)] hover:text-black active:scale-95"
          title="Switch Language (EN / TH)"
          type="button"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{lang === 'en' ? 'EN 🇺🇸' : 'TH 🇹🇭'}</span>
        </button>
      </div>

      {/* Top Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {activeRoom && (
          <button
            onClick={onLeaveRoom}
            className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-950/70 px-3 text-xs font-bold text-red-200 shadow transition hover:bg-red-900/90 hover:border-red-500 active:scale-95"
            title={t.leaveRoom || "Leave room"}
          >
            <LogOut className="h-4 w-4 text-red-400" />
            <span className="hidden sm:inline">{t.leaveRoom || "Leave room"}</span>
          </button>
        )}

        <button 
          onClick={onOpenHowToPlayModal}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--cyan)]/40 bg-black/50 text-sm font-bold text-[var(--cyan)] hover:bg-[var(--cyan)] hover:text-black transition duration-300 shadow-[0_0_12px_rgba(0,243,255,0.2)] active:scale-95"
          title={t.howToPlay || "How to play"}
          type="button"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
