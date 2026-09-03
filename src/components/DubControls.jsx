import React from 'react';
import { 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Settings,
  Lock
} from 'lucide-react';
import VoiceEffectsPanel from './VoiceEffectsPanel';

export default function DubControls({
  currentLineIndex = 0,
  totalLines = 0,
  recordedTakesCount = 0,
  isRecording = false,
  hasRecordedTake = false,
  isMyTurn = true,
  canRecord = true,
  isAlreadyRecorded = false,
  recorderName = '',
  onHearClip,
  onToggleRecord,
  onPlayRecording,
  onPrevClip,
  onNextClip,
  onWatchDub,
  onOpenMicSettings,
  onOpenFeedback,
  t = {}
}) {
  // Keyboard shortcut for [R] to toggle recording
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        if (canRecord && onToggleRecord) {
          onToggleRecord();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleRecord, canRecord]);

  const currentFormatted = String(currentLineIndex + 1).padStart(2, '0');
  const totalFormatted = String(totalLines || 0);

  return (
    <aside className="chapter-panel flex flex-col gap-3 max-w-[320px] w-full" aria-label="Dub controls">
      {/* Chapter Heading Indicator (ON CLIP 01 / 19) */}
      <div className="flex flex-col gap-1.5 pb-1 border-b-2 border-[var(--cyan)]">
        <div className="flex items-baseline justify-between px-1">
          <span className="font-['Barlow_Condensed'] text-sm font-extrabold tracking-wider text-gray-200 uppercase">
            {t.onClip || "ON CLIP"}
          </span>
          <div className="flex items-baseline gap-1 font-['Outfit']">
            <span className="text-3xl font-black text-[var(--cyan)] drop-shadow-[0_0_10px_rgba(0,243,255,0.6)]">
              {currentFormatted}
            </span>
            <span className="text-lg font-bold text-gray-400">/</span>
            <span className="text-xl font-extrabold text-white">
              {totalFormatted}
            </span>
          </div>
        </div>
      </div>

      {/* Control Buttons Stack */}
      <div className="grid gap-2.5">
        {/* Hear Clip (Original Audio) */}
        <button
          onClick={onHearClip}
          className="console-button flex items-center justify-center gap-2"
          type="button"
        >
          <Play className="h-4 w-4 fill-current text-gray-900" />
          <span>{t.hearClip || "Hear clip"}</span>
        </button>

        {/* Record Button */}
        <button
          onClick={() => {
            if (canRecord && onToggleRecord) {
              onToggleRecord();
            }
          }}
          disabled={!canRecord}
          className={`console-button flex items-center justify-between px-4 ${
            isRecording ? 'record-button-active animate-pulse' : 'record-button'
          } ${!canRecord ? 'opacity-50 cursor-not-allowed grayscale-[0.3]' : ''}`}
          title={
            isAlreadyRecorded
              ? `อัดเสียงแล้วโดย ${recorderName || 'ผู้เล่นอื่น'}`
              : canRecord
              ? 'Press [R] to record'
              : 'Wait for your turn'
          }
          type="button"
        >
          <div className="flex items-center gap-2 mx-auto">
            {isRecording ? (
              <>
                <Square className="h-3.5 w-3.5 fill-white text-white" />
                <span>{t.stopRecord || "Stop recording"}</span>
              </>
            ) : isAlreadyRecorded ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  {recorderName ? `พากย์แล้ว (${recorderName})` : 'พากย์เรียบร้อยแล้ว'}
                </span>
              </>
            ) : canRecord ? (
              <>
                <span className="h-3 w-3 rounded-full bg-red-600 border border-white/80 shadow-sm animate-pulse" />
                <span>{t.startRecord || "Start recording"}</span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-gray-500 border border-gray-400" />
                <span>{t.waitTurn || "Wait for your turn"}</span>
              </>
            )}
          </div>
          {canRecord && (
            <span className="text-[10px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded border border-black/30">
              R
            </span>
          )}
        </button>

        {/* Play Recording */}
        <button
          onClick={onPlayRecording}
          disabled={!hasRecordedTake}
          className={`console-button flex items-center justify-center gap-2 ${
            hasRecordedTake ? 'ring-2 ring-[var(--cyan)]/50 shadow-[0_0_12px_rgba(0,243,255,0.3)]' : 'opacity-50 cursor-not-allowed'
          }`}
          type="button"
        >
          <Play className="h-4 w-4 fill-current text-gray-900" />
          <span>{t.playRecording || "Play recording"}</span>
        </button>

        {/* Navigation Buttons Row */}
        <div className="grid grid-cols-[48px_1fr] gap-2">
          <button
            onClick={onPrevClip}
            disabled={currentLineIndex === 0}
            className="console-button flex items-center justify-center p-0"
            type="button"
            title={t.prevClip || "Prev clip"}
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>

          <button
            onClick={onNextClip}
            disabled={currentLineIndex >= (totalLines - 1)}
            className="console-button flex items-center justify-center gap-1.5"
            type="button"
          >
            <span>{t.nextClip || "Next clip"}</span>
            <ChevronRight className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Watch Dub 3D Gold Button */}
        <button
          onClick={onWatchDub}
          className="console-button-gold flex items-center justify-center gap-2 mt-1 py-3 text-base font-black uppercase tracking-wider"
          type="button"
        >
          <Film className="h-5 w-5 fill-black stroke-black" />
          <span>{t.watchDub || "Watch dub"}</span>
        </button>

        {/* Mic Settings & Tools */}
        <div className="mt-2 flex items-center justify-between border-t border-[oklch(28%_0.01_190)] pt-2.5">
          <button
            onClick={onOpenMicSettings}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-[var(--cyan)] transition"
            type="button"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>{t.micSettings || "Mic settings"}</span>
          </button>
        </div>
      </div>

      {/* Voice Effects Side Panel */}
      <VoiceEffectsPanel t={t} />
    </aside>
  );
}
