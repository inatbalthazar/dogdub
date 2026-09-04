import React from 'react';
import { 
  Play, 
  Square, 
  ChevronLeft, 
  ChevronRight, 
  Film, 
  Settings,
  Lock,
  MicOff,
  Mic,
  Sparkles,
  Volume2
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
  hasMicrophone = true,
  onHearClip,
  onToggleRecord,
  onPlayRecording,
  onPrevClip,
  onNextClip,
  onNextTurn,
  onWatchDub,
  onOpenMicSettings,
  voicePreset = 'clean',
  onPresetChange,
  voicePitch = 0,
  onPitchChange,
  voiceTone = 0,
  onToneChange,
  voiceEcho = 0,
  onEchoChange,
  t = {}
}) {
  const [highlightNextTurn, setHighlightNextTurn] = React.useState(false);

  React.useEffect(() => {
    let timer = null;
    if (hasRecordedTake && isMyTurn && !isRecording) {
      timer = setTimeout(() => {
        setHighlightNextTurn(true);
      }, 5000); // 5 seconds after record!
    } else {
      setHighlightNextTurn(false);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [hasRecordedTake, isMyTurn, currentLineIndex, isRecording]);

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

  // Trigger next turn (advances scene & shifts mic to next player)
  const handleNextTurnClick = () => {
    if (!isMyTurn || !hasRecordedTake) return; // ONLY mic holder AND recorded take!
    if (onNextTurn) {
      onNextTurn();
    } else if (onNextClip) {
      onNextClip();
    }
  };

  // Next turn is enabled ONLY IF you are the active mic holder AND the scene has been recorded!
  const isNextTurnDisabled = !isMyTurn || !hasRecordedTake || currentLineIndex >= (totalLines - 1);

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

      {/* High-Energy Turn Banner */}
      {isMyTurn && !isAlreadyRecorded ? (
        <div className="rounded-xl border border-red-500/70 bg-gradient-to-r from-red-950 via-red-900/80 to-red-950 p-2.5 text-center shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse">
          <span className="flex items-center justify-center gap-1.5 text-xs font-black text-white uppercase tracking-wider">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            {t.yourTurnBanner || "🔥 YOUR TURN TO DUB!"}
          </span>
          <span className="block text-[11px] font-bold text-red-200 mt-0.5">
            {t.yourTurnSub || "Press [R] or click to start recording!"}
          </span>
        </div>
      ) : isAlreadyRecorded ? (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-2 text-center shadow-md">
          <span className="flex items-center justify-center gap-1 text-xs font-bold text-emerald-300">
            {t.dubbedDone || "✅ Dubbed successfully"} {recorderName ? `(${recorderName})` : ''}
          </span>
          <span className="block text-[10px] text-emerald-200/80 mt-0.5">
            {isMyTurn ? (t.clickNextTurnHint || 'Click Next turn to advance to next scene!') : (t.waitNextTurnHint || 'Waiting for mic holder to click Next turn...')}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-500/50 bg-amber-950/40 p-2.5 text-center shadow-md">
          <span className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-300">
            <Mic className="h-3.5 w-3.5 animate-bounce text-amber-400" />
            <span>{t.friendTurn || "Friend's Turn:"} <b className="text-white font-extrabold">{recorderName || (t.waitingForPlayer || 'Player in queue')}</b></span>
          </span>
          <span className="block text-[10px] text-gray-400 mt-0.5">
            {t.waitNextTurnHint || 'Waiting for mic holder to click Next turn...'}
          </span>
        </div>
      )}

      {/* Control Buttons Stack */}
      <div className="grid gap-2.5">
        {/* Hear Clip (Original Audio) */}
        <button
          onClick={onHearClip}
          className="flex items-center justify-between rounded-xl border border-[var(--cyan)]/50 bg-gradient-to-r from-[oklch(22%_0.025_200)] via-[oklch(18%_0.02_195)] to-[oklch(14%_0.015_190)] px-3.5 py-2.5 text-xs font-extrabold text-white shadow-md hover:border-[var(--cyan)] hover:bg-[oklch(26%_0.03_200)] active:scale-95 transition-all group"
          type="button"
        >
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-[var(--cyan)] group-hover:scale-110 transition-transform" />
            <span>{t.hearClip || "Hear clip"}</span>
          </div>
          <span className="rounded bg-[var(--cyan)]/20 px-2 py-0.5 text-[10px] font-black text-[var(--cyan)] uppercase tracking-wider border border-[var(--cyan)]/40 shadow-sm">
            🎬 {t.originalClipBadge || "Original Audio"}
          </span>
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
            !hasMicrophone
              ? (t.noMic || 'Microphone not found')
              : !canRecord
              ? (t.waitTurn || 'Wait for your turn')
              : (hasRecordedTake || isAlreadyRecorded)
              ? (t.recordAgain || '🔴 Record again')
              : (t.startRecord || '🔴 Start recording')
          }
          type="button"
        >
          <div className="flex items-center gap-2 mx-auto">
            {isRecording ? (
              <>
                <Square className="h-3.5 w-3.5 fill-white text-white" />
                <span>{t.stopRecord || "Stop recording"}</span>
              </>
            ) : !hasMicrophone ? (
              <>
                <MicOff className="h-3.5 w-3.5 text-red-400" />
                <span className="text-xs text-red-300">{t.noMic || "Microphone not found"}</span>
              </>
            ) : canRecord ? (
              <>
                <span className="h-3 w-3 rounded-full bg-red-600 border border-white/80 shadow-sm animate-pulse" />
                <span className="font-bold">
                  {(hasRecordedTake || isAlreadyRecorded)
                    ? (t.recordAgain || "🔴 Record again")
                    : (t.startRecord || "🔴 Start recording")}
                </span>
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-300">
                  {recorderName ? `${t.dubbedBy || 'Dubbed by'} (${recorderName})` : (t.friendTurn || "Friend's Turn")}
                </span>
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
          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition-all duration-200 ${
            hasRecordedTake
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[var(--cyan)] text-black font-black shadow-lg hover:brightness-110 active:scale-95'
              : 'border border-[oklch(28%_0.01_190)] bg-[oklch(12%_0.01_190)] text-gray-500 opacity-50 cursor-not-allowed'
          }`}
          type="button"
        >
          <div className="flex items-center gap-2">
            <Play className={`h-4 w-4 ${hasRecordedTake ? 'fill-black text-black' : 'fill-gray-500 text-gray-500'}`} />
            <span>{t.playRecording || "Play recording"}</span>
          </div>
          <span className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            hasRecordedTake
              ? 'bg-black/30 text-black border border-black/20'
              : 'bg-black/20 text-gray-500 border border-white/5'
          }`}>
            🎙️ {t.myTakeBadge || "Dubbed Take"}
          </span>
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

          {/* Next Turn Button (ONLY enabled for mic holder once scene is recorded) */}
          <button
            onClick={(e) => {
              setHighlightNextTurn(false);
              handleNextTurnClick(e);
            }}
            disabled={isNextTurnDisabled}
            className={`console-button flex items-center justify-center gap-1.5 transition-all duration-300 ${
              isNextTurnDisabled
                ? 'opacity-40 cursor-not-allowed grayscale'
                : highlightNextTurn
                ? 'bg-gradient-to-r from-[var(--amber)] via-[#ffe600] to-[var(--cyan)] text-black font-black border-2 border-white shadow-[0_0_30px_rgba(255,230,0,0.95),0_0_50px_rgba(0,243,255,0.8)] scale-[1.04] animate-pulse ring-4 ring-[var(--amber)]/60'
                : 'ring-2 ring-[var(--amber)]/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
            }`}
            type="button"
            title={
              !isMyTurn
                ? (t.onlyMicHolderCanNext || 'Only mic holder can advance turn')
                : !hasRecordedTake
                ? (t.recordSceneFirst || 'Record this scene first before passing turn')
                : (t.nextTurnHint || 'Pass turn to next scene')
            }
          >
            {highlightNextTurn && <Sparkles className="h-4 w-4 fill-black text-black animate-spin" />}
            <span className={highlightNextTurn ? 'font-black tracking-wide text-black text-sm uppercase' : ''}>
              {t.nextTurn || "Next turn"}
            </span>
            <ChevronRight className={`h-5 w-5 stroke-[2.5] ${highlightNextTurn ? 'text-black font-black' : ''}`} />
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
      <VoiceEffectsPanel 
        preset={voicePreset}
        onPresetChange={onPresetChange}
        pitch={voicePitch}
        onPitchChange={onPitchChange}
        tone={voiceTone}
        onToneChange={onToneChange}
        echo={voiceEcho}
        onEchoChange={onEchoChange}
        t={t} 
      />
    </aside>
  );
}
