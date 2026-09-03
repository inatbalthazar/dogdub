import React, { useState, useEffect } from 'react';
import { User, Sparkles, Check } from 'lucide-react';

const RANDOM_NAMES = [
  'นักพากย์เงา', 'นักพากย์ระดับเทพ', 'พากย์สะท้านภพ', 'เจ้าพ่อเสียงหล่อ',
  'เสียงพากย์ฮาแตก', 'DUBBER PRO', 'VOICE KING', 'SUPER DUBBER', 'นักพากย์สายป่วน'
];

export default function SetPlayerNameModal({ isOpen, onClose, currentName, onSaveName }) {
  const [nameInput, setNameInput] = useState(currentName || '');

  useEffect(() => {
    if (isOpen) {
      setNameInput(currentName || '');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const random = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    setNameInput(`${random} ${num}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalName = nameInput.trim() || 'นักพากย์';
    onSaveName(finalName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-[oklch(38%_0.01_190)] bg-[oklch(14%_0.01_190)] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--cyan)] bg-[oklch(20%_0.03_195)] text-[var(--cyan)] shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <User className="h-7 w-7" />
          </div>
          <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
            DOGDUB PLAYER PROFILE
          </span>
          <h2 className="font-['Bowlby_One_SC'] text-2xl uppercase tracking-wide text-white">
            ตั้งชื่อผู้เล่นของคุณ
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            กรอกชื่อที่จะแสดงในห้องพากย์เสียงและแสดงเป็นเจ้าของผลงาน
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-gray-300">
              ชื่อผู้เล่น (Player Name):
            </label>
            <div className="relative">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                placeholder="ระบุชื่อของคุณ เช่น นักพากย์ระดับเทพ"
                className="w-full rounded-xl border border-[oklch(38%_0.01_190)] bg-[oklch(20%_0.01_190)] px-4 py-3 text-sm font-bold text-white placeholder-gray-500 focus:border-[var(--cyan)] focus:outline-none focus:ring-1 focus:ring-[var(--cyan)]"
                autoFocus
              />
              <button
                type="button"
                onClick={handleRandomize}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(26%_0.01_190)] px-2.5 py-1.5 text-xs font-bold text-gray-300 transition hover:bg-[oklch(32%_0.01_190)] hover:text-white"
                title="สุ่มชื่อฮาๆ"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--cyan)]" />
                <span>สุ่มชื่อ</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--cyan)] py-3 text-sm font-extrabold text-black shadow transition hover:brightness-110"
          >
            <Check className="h-4 w-4" />
            <span>บันทึกชื่อผู้เล่น (Save Profile)</span>
          </button>
        </form>
      </div>
    </div>
  );
}
