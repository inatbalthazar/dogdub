import React from 'react';
import { 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Settings 
} from 'lucide-react';
import VoiceEffectsPanel from './VoiceEffectsPanel';

export default function DubControls({
  currentLineIndex = 0,
  totalLines = 0,
  recordedTakesCount = 0,
  isRecording = false,
  hasRecordedTake = false,
  isMyTurn = true,
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
        if (isMyTurn && onToggleRecord) {
          onToggleRecord();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleRecord, isMyTurn]);

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
        {/* Hear Clip */}
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
            if (isMyTurn && onToggleRecord) {
              onToggleRecord();
            }
          }}
          disabled={!isMyTurn}
          className={`console-button flex items-center justify-between px-4 ${
            isRecording ? 'record-button-active animate-pulse' : 'record-button'
          } ${!isMyTurn ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isMyTurn ? 'Press [R] to record' : 'Wait for your turn'}
          type="button"
        >
          <div className="flex items-center gap-2 mx-auto">
            {isRecording ? (
              <>
                <Square className="h-3.5 w-3.5 fill-white text-white" />
                <span>{t.stopRecord || "Stop recording"}</span>
              </>
            ) : isMyTurn ? (
              <>
                <span className="h-3 w-3 rounded-full bg-red-600 border border-white/80 shadow-sm" />
                <span>{hasRecordedTake ? (t.recordAgain || "Record again") : (t.startRecord || "Start recording")}</span>
              </>
            ) : (
              <>
                <span className="h-3 w-3 rounded-full bg-gray-500 border border-gray-400" />
                <span>{t.waitTurn || "Wait for your turn"}</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded border border-black/30">
            R
          </span>
        </button>

        {/* Play Recording */}
        <button
          onClick={onPlayRecording}
          disabled={!hasRecordedTake}
          className="console-button flex items-center justify-center gap-2"
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
            disabled={currentLineIndex >= totalLines - 1}
            className="console-button flex items-center justify-center gap-1"
            type="button"
            title={t.nextClip || "Next clip"}
          >
            <span>{t.nextClip || "Next clip"}</span>
            <ChevronRight className="h-4 w-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Watch Dub (Golden Arcade 3D Button) */}
        <button
          onClick={onWatchDub}
          title="Watch full dubbing movie"
          className="console-button console-button-gold flex flex-col items-center justify-center py-2 min-h-[46px]"
          type="button"
        >
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 fill-black text-black" />
            <span className="text-sm font-black tracking-wide">{t.watchDub || "Watch dub"}</span>
          </div>
          <span className="text-[10px] font-semibold text-black/80 -mt-0.5">
            {t.watchDubSub || "Ready - click to watch"}
          </span>
        </button>

        {/* Mic Settings Button */}
        <button
          onClick={onOpenMicSettings}
          className="console-button flex items-center justify-center gap-2"
          type="button"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span>{t.micSettings || "Mic settings"}</span>
        </button>
      </div>

      {/* Voice FX Panel */}
      <VoiceEffectsPanel />
    </aside>
  );
}
