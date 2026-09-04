import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-[oklch(22%_0.01_190)] bg-black/60 py-4 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-gray-400">
        {/* CC BY-NC-ND 4.0 License Badge & Text */}
        <div className="flex items-center gap-2.5">
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
              className="text-[var(--cyan)] hover:underline font-semibold"
            >
              Creative Commons Attribution-NonCommercial-NoDerivs 4.0 Unported License
            </a>
          </span>
        </div>

        {/* Copyright */}
        <div className="text-gray-500 font-mono text-[10px]">
          © {new Date().getFullYear()} DOGDUB • Voice Dubbing Studio
        </div>
      </div>
    </footer>
  );
}
