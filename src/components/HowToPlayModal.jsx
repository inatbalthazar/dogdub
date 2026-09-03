import React from 'react';
import { X, Play, Mic, Volume2, Sparkles, Film, CheckCircle, Globe, Mail } from 'lucide-react';

export default function HowToPlayModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-view-enter">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[oklch(40%_0.015_190)] bg-gradient-to-b from-[oklch(18%_0.02_195)] to-[oklch(12%_0.01_190)] p-6 shadow-2xl animate-modal-pop">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between border-b border-[oklch(28%_0.01_190)] pb-4">
          <div>
            <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              GUIDE & TUTORIAL
            </span>
            <h2 className="font-['Bowlby_One_SC'] text-2xl uppercase tracking-wide text-white md:text-3xl">
              📖 วิธีการเล่น DOGDUB
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-[oklch(38%_0.01_190)] bg-black/50 p-2 text-gray-400 transition hover:bg-[oklch(30%_0.01_190)] hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-4 rounded-2xl border border-[oklch(28%_0.01_190)] bg-black/40 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--cyan)] text-black font-extrabold text-lg">
              1
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Play className="h-4 w-4 text-[var(--cyan)]" />
                <span>เลือกฉากพากย์ & ฟังเสียงต้นฉบับ (Hear Clip)</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                เลือก Scene Pack ฉากหนังที่ต้องการพากย์ จากนั้นกดปุ่ม <b className="text-white">Hear clip</b> เพื่อฟังจังหวะการส่งอารมณ์และน้ำเสียงของตัวละครต้นฉบับ
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4 rounded-2xl border border-[oklch(28%_0.01_190)] bg-black/40 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-500 text-white font-extrabold text-lg">
              2
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Mic className="h-4 w-4 text-red-400" />
                <span>อัดเสียงพากย์ของคุณ (Start Recording [R])</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                กดปุ่ม <b className="text-red-400">Start recording [R]</b> หรือกดปุ่ม <b className="text-amber-400">R บนคีย์บอร์ด</b> ระบบจะนับถอยหลังเตรียมตัว จากนั้นพูดพากย์เสียงของคุณตามคำบรรยายซับไตเติลบนหน้าจอ
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4 rounded-2xl border border-[oklch(28%_0.01_190)] bg-black/40 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-purple-500 text-white font-extrabold text-lg">
              3
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Volume2 className="h-4 w-4 text-purple-300" />
                <span>ลองฟังเสียงที่คุณอัด (Play Recording)</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                กดปุ่ม <b className="text-white">Play recording</b> เพื่อฟังเสียงที่คุณอัดเทียบกับคลิปเดิม สามารถพากย์ใหม่ (Record again) ได้ไม่จำกัดจำนวนครั้งจนกว่าจะพอใจ
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4 rounded-2xl border border-[oklch(28%_0.01_190)] bg-black/40 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-black font-extrabold text-lg">
              4
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>ปรับเปลี่ยนเอฟเฟกต์เสียงพากย์ (Voice Effect)</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                สามารถเปลี่ยนเสียงพากย์ของคุณด้วยเอฟเฟกต์พิเศษ เช่น <b className="text-amber-300">Pitch Shift (ปรับพิทช์เสียงสูง/ต่ำ), Robot (เสียงหุ่นยนต์), Monster (เสียงอสูรกายทุ้มลึก)</b> ในเมนูด้านขวา
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4 rounded-2xl border border-[oklch(28%_0.01_190)] bg-black/40 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-black font-extrabold text-lg">
              5
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Film className="h-4 w-4 text-emerald-300" />
                <span>รับชมวิดีโอฉบับพากย์เต็ม & ดาวน์โหลด (Watch Dub & Export)</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed">
                กดปุ่ม <b className="text-amber-400">Watch dub</b> ได้ทุกเมื่อ เพื่อชมภาพยนตร์ฉากเต็มโดยมีเสียงพากย์ของคุณซ้อนทับ และกดปุ่ม <b className="text-[var(--cyan)]">↓ Export video</b> เพื่อเรนเดอร์ลงเครื่อง!
              </p>
            </div>
          </div>
        </div>

        {/* Creator Info Box - "who vibe this?" */}
        <div className="mt-6 rounded-2xl border border-[var(--cyan)]/30 bg-gradient-to-r from-[oklch(18%_0.03_205)] via-[oklch(14%_0.015_195)] to-[oklch(12%_0.01_190)] p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Left / Avatar & Title */}
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <img
                  src="/creator.jpg"
                  alt="Creator Profile"
                  className="h-14 w-14 rounded-full border-2 border-[var(--cyan)] object-cover shadow-[0_0_15px_rgba(0,243,255,0.4)]"
                />
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--amber)] text-[10px] text-black shadow">
                  ✨
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--cyan)]">
                  CREATOR INFO
                </span>
                <h4 className="font-['Bowlby_One_SC'] text-lg tracking-wide text-white drop-shadow-[0_0_8px_rgba(0,243,255,0.4)]">
                  who vibe this?
                </h4>
              </div>
            </div>

            {/* Right / Contact Links */}
            <div className="flex flex-col sm:items-end gap-1.5 text-xs font-semibold">
              <a
                href="https://codenat.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[var(--cyan)]/40 bg-black/50 px-3.5 py-1.5 text-white transition-all hover:border-[var(--cyan)] hover:bg-[var(--cyan)]/15 hover:shadow-[0_0_12px_rgba(0,243,255,0.3)] active:scale-95"
              >
                <Globe className="h-4 w-4 text-[var(--cyan)]" />
                <span>codenat.me</span>
              </a>

              <a
                href="mailto:inatbalthazar@gmail.com"
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3.5 py-1.5 text-gray-300 transition-all hover:border-white/30 hover:text-white active:scale-95"
              >
                <Mail className="h-4 w-4 text-amber-400" />
                <span>inatbalthazar@gmail.com</span>
              </a>
            </div>
          </div>
        </div>

        {/* License Block */}
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-gray-800 bg-black/40 px-3.5 py-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-2">
            <a
              href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="https://i.creativecommons.org/l/by-nc-nd/4.0/88x31.png"
                alt="CC BY-NC-ND 4.0"
                className="h-4.5 w-auto rounded opacity-80 hover:opacity-100 transition"
              />
            </a>
            <span>
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
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl bg-[var(--cyan)] px-6 py-2.5 text-xs font-extrabold text-black shadow transition hover:brightness-110 active:scale-95"
          >
            <CheckCircle className="h-4 w-4" />
            <span>เข้าใจแล้ว! (Got it!)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
