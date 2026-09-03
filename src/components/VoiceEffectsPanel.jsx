import React, { useState } from 'react';
import { Sliders, ChevronDown, ChevronUp } from 'lucide-react';

export default function VoiceEffectsPanel({
  preset = 'clean',
  onPresetChange,
  pitch = 0,
  onPitchChange,
  tone = 0,
  onToneChange,
  echo = 0,
  onEchoChange,
  t = {}
}) {
  const [isOpenFineTune, setIsOpenFineTune] = useState(false);

  return (
    <section className="mt-3 rounded border border-[oklch(39%_0.018_190)] bg-[oklch(13%_0.012_190)] p-2.5 text-xs text-white">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold">
          <Sliders className="h-3.5 w-3.5 text-[var(--cyan)]" />
          <span>{t.voiceEffectTitle || "Voice Effect"}</span>
        </div>
        <span className="text-[10px] text-emerald-400 font-extrabold">Preset: {preset.toUpperCase()}</span>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={preset}
          onChange={(e) => onPresetChange && onPresetChange(e.target.value)}
          className="flex-1 rounded border border-[oklch(47%_0.045_334)] bg-[oklch(22%_0.018_190)] px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:ring-1 focus:ring-[var(--cyan)] cursor-pointer"
        >
          <option value="clean">{t.presetOriginal || "Original (Normal)"}</option>
          <option value="deep">{t.presetDeep || "Deep Voice"}</option>
          <option value="cartoon">{t.presetCartoon || "Cartoon Pitch"}</option>
          <option value="robot">{t.presetRobot || "Robot Synthesizer"}</option>
          <option value="radio">{t.presetRadio || "Walkie-Talkie Radio"}</option>
          <option value="echo">{t.presetEcho || "Echo Reverb"}</option>
          <option value="cave">{t.presetCave || "Deep Cave"}</option>
          <option value="monster">{t.presetMonster || "Monster Creature"}</option>
          <option value="alien">{t.presetAlien || "Alien Voice"}</option>
          <option value="telephone">{t.presetTelephone || "Telephone Call"}</option>
          <option value="chorus">{t.presetChorus || "Voice Chorus"}</option>
          <option value="megaphone">{t.presetMegaphone || "Loud Megaphone"}</option>
        </select>

        <button
          type="button"
          onClick={() => setIsOpenFineTune(!isOpenFineTune)}
          className="flex items-center gap-1 rounded border border-[oklch(37%_0.015_190)] bg-[oklch(18%_0.014_190)] px-2 py-1.5 text-[11px] font-bold text-gray-300 hover:text-white"
        >
          <span>{t.fineTune || "Fine tune"}</span>
          {isOpenFineTune ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {isOpenFineTune && (
        <div className="mt-3 grid gap-2 border-t border-[oklch(24%_0.01_190)] pt-2.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">{t.pitchLabel || "Pitch"}</span>
            <input
              type="range"
              min="-9"
              max="9"
              value={pitch}
              onChange={(e) => onPitchChange && onPitchChange(Number(e.target.value))}
              className="w-28 accent-[var(--cyan)] cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold text-[var(--cyan)]">{pitch} st</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">{t.toneLabel || "Tone"}</span>
            <input
              type="range"
              min="-100"
              max="100"
              value={tone}
              onChange={(e) => onToneChange && onToneChange(Number(e.target.value))}
              className="w-28 accent-[var(--cyan)] cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold text-[var(--cyan)]">{tone}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">{t.echoLabel || "Echo"}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={echo}
              onChange={(e) => onEchoChange && onEchoChange(Number(e.target.value))}
              className="w-28 accent-[var(--cyan)] cursor-pointer"
            />
            <span className="w-8 text-right font-mono font-bold text-[var(--cyan)]">{echo}%</span>
          </div>
        </div>
      )}
    </section>
  );
}
