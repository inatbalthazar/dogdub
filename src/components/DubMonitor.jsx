import React, { useRef, useEffect, useState } from 'react';
import { Tv } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

function loadOGVLibrary() {
  return new Promise((resolve, reject) => {
    if (window.OGVPlayer) {
      if (window.OGVLoader) window.OGVLoader.base = '/vendor/ogv';
      return resolve(window.OGVPlayer);
    }
    const script = document.createElement('script');
    script.src = '/vendor/ogv/ogv.js';
    script.onload = () => {
      if (window.OGVLoader) window.OGVLoader.base = '/vendor/ogv';
      resolve(window.OGVPlayer);
    };
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export default function DubMonitor({ 
  currentLine, 
  currentLineIndex = 0, 
  totalLines = 0, 
  packTitle = '',
  recordedTakeUrl = null,
  isPlaying = false,
  isRecording = false,
  onAutoStopRecord = null
}) {
  const canvasRef = useRef(null);
  const videoRef = useRef(null);
  const ogvContainerRef = useRef(null);
  const ogvPlayerRef = useRef(null);

  const [playbackTime, setPlaybackTime] = useState(0);
  const [clipDurationNum, setClipDurationNum] = useState(2.4);
  const [origPeaks, setOrigPeaks] = useState(null);
  const [takePeaks, setTakePeaks] = useState(null);
  const [isOgvReady, setIsOgvReady] = useState(false);

  const rawVideoUrl = currentLine?.videoUrl || null;
  const lineTimestamp = currentLine?.timestamp || 0;
  const isOgvVideo = Boolean(
    currentLine?.isOgvVideo ||
    (rawVideoUrl && (rawVideoUrl.toLowerCase().includes('.ogv') || rawVideoUrl.toLowerCase().endsWith('.ogv')))
  );

  // Initialize OGV.js Player for WebAssembly .ogv video decoding
  useEffect(() => {
    let isMounted = true;

    loadOGVLibrary().then((OGVPlayer) => {
      if (!isMounted || !ogvContainerRef.current) return;

      if (!ogvPlayerRef.current) {
        const player = new OGVPlayer({
          options: { basePath: '/vendor/ogv' }
        });
        player.style.width = '100%';
        player.style.height = '100%';
        player.style.objectFit = 'contain';
        player.muted = true; // Mute video audio track so clip audio plays cleanly

        ogvContainerRef.current.appendChild(player);
        ogvPlayerRef.current = player;
        setIsOgvReady(true);
      }
    }).catch((err) => {
      console.warn('Failed to load ogv.js player engine:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Update OGV Player and Native Video source and currentTime when line changes
  useEffect(() => {
    const ogvPlayer = ogvPlayerRef.current;
    const video = videoRef.current;

    if (rawVideoUrl) {
      if (ogvPlayer) {
        try {
          if (ogvPlayer.src !== rawVideoUrl) ogvPlayer.src = rawVideoUrl;
          ogvPlayer.currentTime = lineTimestamp || 0;
        } catch (e) {}
      }

      if (video) {
        try {
          if (video.src !== rawVideoUrl) video.src = rawVideoUrl;
          video.currentTime = lineTimestamp || 0;
        } catch (e) {}
      }
    }
  }, [rawVideoUrl, lineTimestamp, currentLineIndex, isOgvReady]);

  // Video ONLY plays when isPlaying is true OR during recording AFTER 1.0s lead-in prep (when playbackTime >= 0.0)
  const isVideoPlaying = isPlaying || (isRecording && playbackTime >= 0.0);

  // Sync Native Video and OGV Player playback with isVideoPlaying
  useEffect(() => {
    const video = videoRef.current;
    const ogvPlayer = ogvPlayerRef.current;

    if (isVideoPlaying) {
      if (video && rawVideoUrl) {
        try {
          video.currentTime = lineTimestamp || 0;
          video.play().catch(() => {});
        } catch (e) {}
      }
      if (ogvPlayer && rawVideoUrl) {
        try {
          ogvPlayer.currentTime = lineTimestamp || 0;
          ogvPlayer.play();
        } catch (e) {}
      }
    } else {
      if (video) {
        try {
          video.pause();
          video.currentTime = lineTimestamp || 0;
        } catch (e) {}
      }
      if (ogvPlayer) {
        try {
          ogvPlayer.pause();
          ogvPlayer.currentTime = lineTimestamp || 0;
        } catch (e) {}
      }
    }
  }, [isVideoPlaying, rawVideoUrl, lineTimestamp]);

  // Decode audio waveform peaks for Original Audio
  useEffect(() => {
    let isCancelled = false;

    async function decodeAudio() {
      if (!currentLine?.audioUrl) {
        setOrigPeaks(null);
        setClipDurationNum(2.4);
        return;
      }
      try {
        const res = await fetch(currentLine.audioUrl);
        const arrayBuf = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        if (isCancelled) return;
        const dur = audioBuf.duration || 2.4;
        setClipDurationNum(dur);

        const channelData = audioBuf.getChannelData(0);
        const sampleCount = 120;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const peaks = [];

        for (let i = 0; i < sampleCount; i++) {
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const val = Math.abs(channelData[i * blockSize + j] || 0);
            if (val > max) max = val;
          }
          peaks.push(max);
        }
        setOrigPeaks(peaks);
      } catch (err) {
        console.warn('Failed to decode original audio waveform:', err);
        setOrigPeaks(null);
      }
    }

    decodeAudio();
    return () => { isCancelled = true; };
  }, [currentLine?.audioUrl]);

  // Decode audio waveform peaks for Recorded Take Audio
  useEffect(() => {
    let isCancelled = false;

    async function decodeTake() {
      if (!recordedTakeUrl) {
        setTakePeaks(null);
        return;
      }
      try {
        const res = await fetch(recordedTakeUrl);
        const arrayBuf = await res.arrayBuffer();
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioCtx();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);

        if (isCancelled) return;

        const channelData = audioBuf.getChannelData(0);
        const sampleCount = 120;
        const blockSize = Math.floor(channelData.length / sampleCount);
        const peaks = [];

        for (let i = 0; i < sampleCount; i++) {
          let max = 0;
          for (let j = 0; j < blockSize; j++) {
            const val = Math.abs(channelData[i * blockSize + j] || 0);
            if (val > max) max = val;
          }
          peaks.push(max);
        }
        setTakePeaks(peaks);
      } catch (err) {
        console.warn('Failed to decode take audio waveform:', err);
        setTakePeaks(null);
      }
    }

    decodeTake();
    return () => { isCancelled = true; };
  }, [recordedTakeUrl]);

  // Recording & Playback Animation Loop:
  // When recording: 1.0s lead-in prep (-1.0 to 0.0), video & media recorder start EXACTLY at 0.0s!
  const onAutoStopRef = useRef(onAutoStopRecord);
  const recordingStartTimeRef = useRef(null);
  const micRecorderStartedRef = useRef(false);
  const autoStopTriggeredRef = useRef(false);

  useEffect(() => {
    onAutoStopRef.current = onAutoStopRecord;
  }, [onAutoStopRecord]);

  // Reset recording refs when isRecording turns false or true
  useEffect(() => {
    if (isRecording) {
      if (!recordingStartTimeRef.current) {
        recordingStartTimeRef.current = performance.now();
        micRecorderStartedRef.current = false;
        autoStopTriggeredRef.current = false;
      }
    } else {
      recordingStartTimeRef.current = null;
      micRecorderStartedRef.current = false;
      autoStopTriggeredRef.current = false;
    }
  }, [isRecording]);

  useEffect(() => {
    let animFrame = null;

    if (isRecording) {
      const updateProgress = (now) => {
        if (!recordingStartTimeRef.current) {
          recordingStartTimeRef.current = now;
        }
        const elapsedSecs = (now - recordingStartTimeRef.current) / 1000;
        const currentPlaybackTime = -1.0 + elapsedSecs; // Starts at -1.0 for 1.0s prep time!

        setPlaybackTime(currentPlaybackTime);

        // Start actual MediaRecorder audio capture right at 0.0s!
        if (currentPlaybackTime >= 0.0 && !micRecorderStartedRef.current) {
          micRecorderStartedRef.current = true;
          audioEngine.beginMediaRecorder();
        }

        // Auto-stop when playhead reaches the end of current scene
        const targetDuration = clipDurationNum || currentLine?.duration || 2.4;
        if (currentPlaybackTime >= targetDuration) {
          setPlaybackTime(targetDuration);
          if (!autoStopTriggeredRef.current) {
            autoStopTriggeredRef.current = true;
            if (onAutoStopRef.current) {
              onAutoStopRef.current();
            }
          }
          return;
        }

        animFrame = requestAnimationFrame(updateProgress);
      };
      animFrame = requestAnimationFrame(updateProgress);
    } else if (isPlaying) {
      const startTime = performance.now();
      const updateProgress = (now) => {
        const elapsed = (now - startTime) / 1000;
        setPlaybackTime(elapsed);
        const targetDuration = clipDurationNum || currentLine?.duration || 2.4;
        if (elapsed <= targetDuration) {
          animFrame = requestAnimationFrame(updateProgress);
        } else {
          setPlaybackTime(0);
        }
      };
      animFrame = requestAnimationFrame(updateProgress);
    } else {
      setPlaybackTime(0);
    }

    return () => {
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, [isRecording, isPlaying, clipDurationNum, currentLine?.duration]);

  // Timeline & Waveform Calculations (1.0s padding before 0.0, 1.0s padding after clip end)
  const windowDuration = clipDurationNum + 2.0;
  const clipStartPct = (1.0 / windowDuration) * 100;
  const clipEndPct = ((1.0 + clipDurationNum) / windowDuration) * 100;

  // Exact Playhead percentage position:
  // When Recording: starts at -1.0 (0%), reaches 0.0 (clipStartPct), video plays & media recorder starts at 0.0, stops at clipEndPct (2nd red line)
  // When Playing: starts at 0.0 (clipStartPct), slides to clipEndPct
  // When Idle: sits at 0.0 (clipStartPct)
  let playheadPct = clipStartPct;
  if (isRecording) {
    const ratio = Math.min(1, Math.max(0, (playbackTime + 1.0) / windowDuration));
    playheadPct = ratio * 100;
  } else if (isPlaying) {
    const ratio = Math.min(1, Math.max(0, playbackTime / clipDurationNum));
    playheadPct = clipStartPct + ratio * (clipEndPct - clipStartPct);
  } else {
    playheadPct = clipStartPct;
  }

  // Draw Overlap Waveform Canvas (Center axis line, dashed bounds at 0.0 and clipEnd, PCM peaks)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, w, h);

    const midY = h / 2;
    const clipStartPx = w * (1.0 / windowDuration);
    const clipEndPx = w * ((1.0 + clipDurationNum) / windowDuration);
    const waveWidth = clipEndPx - clipStartPx;

    // Center horizontal axis hairline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Red dashed vertical clip boundary lines at 0.0 and clip end
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#ff4d4d';
    ctx.lineWidth = 1.5;

    // Start bound line (0.0)
    ctx.beginPath();
    ctx.moveTo(clipStartPx, 0);
    ctx.lineTo(clipStartPx, h);
    ctx.stroke();

    // End bound line (clipEnd)
    ctx.beginPath();
    ctx.moveTo(clipEndPx, 0);
    ctx.lineTo(clipEndPx, h);
    ctx.stroke();

    ctx.setLineDash([]); // Reset line dash

    // Draw Original Audio Waveform (Magenta #E6007A)
    ctx.fillStyle = '#E6007A';
    if (origPeaks && origPeaks.length > 0) {
      const step = waveWidth / origPeaks.length;
      origPeaks.forEach((p, idx) => {
        const barH = Math.max(2, p * (h * 0.85));
        const x = clipStartPx + idx * step;
        ctx.fillRect(x, midY - barH / 2, 2.5, barH);
      });
    } else {
      for (let x = clipStartPx; x < clipEndPx; x += 3) {
        const progress = (x - clipStartPx) / waveWidth;
        const amp = Math.sin(progress * Math.PI * 4) * Math.cos(progress * Math.PI * 1.5) * (h * 0.38) + 4;
        ctx.fillRect(x, midY - Math.abs(amp) / 2, 2, Math.max(2, Math.abs(amp)));
      }
    }

    // Draw Recorded Take Waveform (Cyan #00F0FF) - Overlapping
    ctx.fillStyle = '#00F0FF';
    if (takePeaks && takePeaks.length > 0) {
      const step = waveWidth / takePeaks.length;
      takePeaks.forEach((p, idx) => {
        const barH = Math.max(2, p * (h * 0.85));
        const x = clipStartPx + idx * step;
        ctx.fillRect(x + 1, midY - barH / 2, 2.5, barH);
      });
    } else if (recordedTakeUrl) {
      for (let x = clipStartPx + 5; x < clipEndPx - 5; x += 3) {
        const progress = (x - clipStartPx) / waveWidth;
        const amp = Math.sin(progress * Math.PI * 3.5) * (h * 0.4) + 3;
        ctx.fillRect(x, midY - Math.abs(amp) / 2, 2, Math.max(2, Math.abs(amp)));
      }
    }
  }, [currentLineIndex, currentLine, origPeaks, takePeaks, recordedTakeUrl, clipDurationNum, windowDuration]);

  // Format playback timer & status
  const displaySecs = Math.max(0, Math.floor(playbackTime));
  const formattedTime = `00:${String(displaySecs).padStart(2, '0')}`;
  const formattedDurationStr = `${windowDuration.toFixed(1)}S WINDOW`;
  const formattedClipEndStr = clipDurationNum.toFixed(1);

  let recordStateText = '';
  if (isRecording) {
    if (playbackTime < 0) {
      recordStateText = 'GET READY...';
    } else {
      recordStateText = 'RECORDING';
    }
  } else if (isPlaying) {
    recordStateText = 'Playing original line';
  }

  return (
    <div className="w-full">
      {/* CRT TV Monitor Card */}
      <div className="dub-card">
        {/* Brand Header */}
        <div className="tv-brand-row">
          <span>DOGDUB VISION</span>
          <i />
          <span>DOGDUB MONITOR</span>
        </div>

        {/* TV Outer Bezel */}
        <div className="tv-bezel">
          {/* CRT Screen */}
          <div className="video-wrap">
            {/* CRT Scanline effect overlay */}
            <div className="scanlines" />

            {/* Top CUE Badge */}
            <div className="absolute top-2.5 left-3 z-10">
              <div className="inline-flex items-center gap-1.5 rounded border border-red-500/40 bg-black/75 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
                <span className={`h-2 w-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-red-500 animate-pulse-dot'}`} />
                <span className="font-['Barlow_Condensed'] uppercase tracking-wider text-red-400">
                  {isRecording ? (playbackTime < 0 ? 'READY' : 'REC') : 'CUE'} {formattedTime}
                </span>
              </div>
            </div>

            {/* Full Screen Visual Content (Native Video, OGV Video, or HD Scene Image) */}
            <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
              {/* Native HTML5 Video Element */}
              {rawVideoUrl && !isOgvVideo && (
                <video
                  ref={videoRef}
                  src={rawVideoUrl}
                  playsInline
                  muted
                  controls={false}
                  className="h-full w-full object-contain"
                />
              )}

              {/* OGV.js Video Player Container */}
              <div 
                ref={ogvContainerRef} 
                className={`h-full w-full flex items-center justify-center ${rawVideoUrl && isOgvVideo ? 'block' : 'hidden'}`}
              />

              {/* Image Frame Fallback when no video URL */}
              {!rawVideoUrl && currentLine?.imageUrl && (
                <img
                  src={currentLine.imageUrl}
                  alt={currentLine.speaker || 'Scene'}
                  className="h-full w-full object-contain"
                />
              )}

              {!rawVideoUrl && !currentLine?.imageUrl && (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                  <Tv className="h-12 w-12 text-[var(--cyan)]" />
                  <span className="text-xs font-bold text-[var(--muted)]">READY FOR DUBBING</span>
                </div>
              )}

              {/* Subtitle Overlay */}
              <div className="absolute bottom-3 left-1/2 z-10 w-[90%] -translate-x-1/2 text-center drop-shadow-md pointer-events-none">
                <span className="inline-block rounded bg-[var(--cyan)] px-2.5 py-0.5 text-[11px] font-extrabold text-black uppercase tracking-wide">
                  {currentLine?.speaker || 'VOICE'}
                </span>
                <h2 className="mt-1 text-base font-extrabold text-white md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {currentLine?.text || '(painful scream)'}
                </h2>
              </div>
            </div>
          </div>
        </div>

        {/* TV Console Bar */}
        <div className="tv-console">
          <div className="dub-controls-info">
            <span>FRAME HOLD</span>
            <span className="text-[var(--cyan)] font-mono">01:33 MASTER</span>
          </div>

          <div className="deck-bay">
            <div className="speaker-grille" />
            <div className="vcr-slot">
              <div className="slot-mouth" />
              <b>{packTitle || "Star Wars - I'm your father"}</b>
            </div>
          </div>

          {currentLine?.imageUrl ? (
            <img src={currentLine.imageUrl} alt="thumb" className="line-thumb rounded" />
          ) : (
            <div className="h-[18px] w-[25px] rounded bg-[oklch(18%_0.008_190)] border border-[oklch(28%_0.01_190)]" />
          )}
        </div>
      </div>

      {/* OVERLAP WAVEFORM Section (1.0s prep lead-in from -1.0, video & audio start EXACTLY at 0.0) */}
      <section className="reference-wave-block" aria-label="Audio waveform">
        <div className="wave-heading">
          <div>
            <span className="eyebrow">OVERLAP WAVEFORM</span>
            <strong>
              <i className="legend original"></i> Original <i className="legend player"></i> Your take
            </strong>
          </div>
          <span className="slot-readout">
            <b id="slotDuration">{formattedDurationStr}</b>
          </span>
        </div>

        <div
          className="wave-shell"
          style={{
            '--wave-clip-start': `${clipStartPct}%`,
            '--wave-clip-end': `${clipEndPct}%`,
          }}
        >
          <div className="time-markers">
            <span className="timeline-start">-1.0</span>
            <span className="clip-start">0.0</span>
            <span className="clip-end" id="waveClipEndMarker">
              {formattedClipEndStr}
            </span>
            <span className="timeline-end">+1.0</span>
          </div>

          <canvas
            ref={canvasRef}
            id="waveCanvas"
            className="wave-canvas"
            aria-label="Original and recorded audio waveform"
            width={648}
            height={49}
          />

          {/* Glowing Red Playhead line: starts at -1.0 for 1.0s prep, reaches 0.0 where video & audio start, stops at 2nd red dashed line */}
          <span
            id="wavePlayhead"
            className="wave-playhead"
            style={{
              display: 'block',
              left: `${playheadPct}%`,
            }}
          />
        </div>

        <div className="wave-status">
          <div className="flex items-center gap-2">
            <i className="status-light"></i>
            <span id="recordState" className="text-xs font-bold text-[var(--cyan)]">
              {recordStateText}
            </span>
            <b id="recordTime" className="text-xs font-mono font-bold text-[var(--cyan)] ml-1">
              {formattedTime}
            </b>
          </div>
        </div>
      </section>
    </div>
  );
}
