import React from 'react';
import { Globe, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[oklch(22%_0.01_190)] bg-black/60 py-6 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 space-y-6">
        
        {/* Creator Info Box (Matching User Screenshot with Overlapping Avatars) */}
        <div className="rounded-2xl border border-[oklch(38%_0.015_190)] bg-gradient-to-r from-[oklch(18%_0.02_205)] via-[oklch(14%_0.015_195)] to-[oklch(12%_0.01_190)] p-5 shadow-xl transition-all duration-300 hover:border-[var(--cyan)]/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-5">
            
            {/* Left Section: Overlapping Avatars & Title */}
            <div className="flex items-center gap-4">
              
              {/* Stacked Avatars from Left to Right */}
              <div className="flex items-center -space-x-3.5 hover:space-x-0.5 transition-all duration-300 group/avatars py-1">
                {/* 1. Main Creator Picture (In Front) */}
                <div className="relative z-50 transition-all duration-300 hover:scale-115 hover:z-50 cursor-pointer">
                  <img
                    src="/creator.jpg"
                    alt="Creator"
                    className="h-14 w-14 rounded-full border-2 border-[var(--cyan)] object-cover shadow-lg"
                  />
                  <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-[var(--amber)] text-[10px] text-black shadow font-bold">
                    ✨
                  </span>
                </div>

                {/* 2. Team Member 1 (Man in Suit) */}
                <div className="relative z-40 transition-all duration-300 hover:scale-115 hover:z-50 cursor-pointer">
                  <img
                    src="/team/member_1.jpg"
                    alt="Team Member 1"
                    className="h-12 w-12 rounded-full border-2 border-[oklch(38%_0.015_190)] object-cover shadow-md bg-black/60"
                  />
                </div>

                {/* 3. Team Member 2 (Person with Peace Sign) */}
                <div className="relative z-30 transition-all duration-300 hover:scale-115 hover:z-50 cursor-pointer">
                  <img
                    src="/team/member_2.jpg"
                    alt="Team Member 2"
                    className="h-12 w-12 rounded-full border-2 border-[oklch(38%_0.015_190)] object-cover shadow-md bg-black/60"
                  />
                </div>

                {/* 4. Team Member 3 (Woman with Hijab) */}
                <div className="relative z-20 transition-all duration-300 hover:scale-115 hover:z-50 cursor-pointer">
                  <img
                    src="/team/member_3.jpg"
                    alt="Team Member 3"
                    className="h-12 w-12 rounded-full border-2 border-[oklch(38%_0.015_190)] object-cover shadow-md bg-black/60"
                  />
                </div>

                {/* 5. Team Member 4 (Woman in Car) */}
                <div className="relative z-10 transition-all duration-300 hover:scale-115 hover:z-50 cursor-pointer">
                  <img
                    src="/team/member_4.jpg"
                    alt="Team Member 4"
                    className="h-12 w-12 rounded-full border-2 border-[oklch(38%_0.015_190)] object-cover shadow-md bg-black/60"
                  />
                </div>
              </div>

              {/* Title Header */}
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--cyan)]">
                  CREATOR INFO
                </span>
                <h4 className="font-['Bowlby_One_SC'] text-lg tracking-wide text-white">
                  WHO VIBE THIS?
                </h4>
              </div>
            </div>

            {/* Right Section: Contact Links */}
            <div className="flex flex-col sm:flex-row md:flex-col items-center sm:items-end gap-2 text-xs font-semibold">
              <a
                href="https://codenat.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[var(--cyan)]/40 bg-black/50 px-4 py-2 text-white transition-all hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/15 active:scale-95 shadow"
              >
                <Globe className="h-4 w-4 text-[var(--cyan)]" />
                <span className="font-bold">codenat.me</span>
              </a>

              <a
                href="mailto:inatbalthazar@gmail.com"
                className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-4 py-2 text-gray-300 transition-all hover:border-amber-400/50 hover:text-white active:scale-95 shadow"
              >
                <Mail className="h-4 w-4 text-[var(--amber)]" />
                <span className="font-bold">inatbalthazar@gmail.com</span>
              </a>
            </div>

          </div>
        </div>

        {/* License Block & Copyright Row */}
        <div className="rounded-xl border border-[oklch(22%_0.01_190)] bg-black/40 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <a
              href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block transition hover:opacity-80"
              title="Creative Commons Attribution-NonCommercial-NoDerivs 4.0 Unported License"
            >
              <img
                src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png"
                alt="CC BY-NC-ND 4.0"
                className="h-5 w-auto rounded border border-gray-700/80 shadow"
              />
            </a>
            <span className="text-gray-400 leading-tight">
              This work is licensed under a{' '}
              <a
                href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--amber)] hover:underline font-bold"
              >
                Creative Commons Attribution-NonCommercial-NoDerivs 4.0 Unported License
              </a>
            </span>
          </div>

          <div className="text-gray-500 font-mono text-[10px]">
            © {new Date().getFullYear()} DOGDUB • Voice Dubbing Studio
          </div>
        </div>

      </div>
    </footer>
  );
}
