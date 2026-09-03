import React, { useRef, useEffect, useState } from 'react';
import { X, RotateCcw, Download, Tv, Film } from 'lucide-react';

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

export default function WatchDubModal({
  isOpen,
  onClose,
  packTitle = "Star Wars - I'm your father",
  packLines = [],
  backingTrackUrl = null,
  recordedTakes = {},
}) {
  const [backingVolume, setBackingVolume] = useState(100);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [currentActiveLine, setCurrentActiveLine] = useState(null);

  const ogvContainerRef = useRef(null);
  const ogvPlayerRef = useRef(null);
  const activeAudioSourcesRef = useRef([]);
  const backingGainNodeRef = useRef(null);

  // Sync backing volume slider in real-time
  useEffect(() => {
    if (backingGainNodeRef.current) {
      backingGainNodeRef.current.gain.value = backingVolume / 100;
    }
  }, [backingVolume]);

  // Auto-play when modal opens / cleanup on close
  useEffect(() => {
    if (isOpen) {
      handlePlayFullDub();
    } else {
      stopPlayback();
    }
    return () => {
      stopPlayback();
    };
  }, [isOpen]);

  const stopPlayback = () => {
    setIsPlaying(false);
    activeAudioSourcesRef.current.forEach((src) => {
      try { src.stop(); } catch (e) {}
    });
    activeAudioSourcesRef.current = [];

    if (ogvPlayerRef.current) {
      try {
        ogvPlayerRef.current.pause();
        if (ogvPlayerRef.current.parentNode) {
          ogvPlayerRef.current.parentNode.removeChild(ogvPlayerRef.current);
        }
      } catch (e) {}
      ogvPlayerRef.current = null;
    }

    if (ogvContainerRef.current) {
      ogvContainerRef.current.innerHTML = '';
    }
  };

  const handlePlayFullDub = async () => {
    stopPlayback();
    setIsPlaying(true);

    try {
      // 1. Initialize AudioContext and ensure active state
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // 2. Initialize OGV Video Player for full continuous video playback
      const OGVPlayer = await loadOGVLibrary();
      if (ogvContainerRef.current) {
        ogvContainerRef.current.innerHTML = '';

        const player = new OGVPlayer({ options: { basePath: '/vendor/ogv' } });
        player.style.width = '100%';
        player.style.height = '100%';
        player.style.objectFit = 'contain';
        player.muted = true; // Mute video original spoken audio
        ogvContainerRef.current.appendChild(player);
        ogvPlayerRef.current = player;

        if (packLines.length > 0 && packLines[0]?.videoUrl) {
          try {
            player.src = packLines[0].videoUrl;
            player.currentTime = 0;
            player.play();
          } catch (e) {}
        }
      }

      const startTime = ctx.currentTime + 0.1;
      let totalSceneDuration = 0;

      // 3. Play Backing Track (Music & Sound Effects without original voice)
      if (backingTrackUrl) {
        try {
          const res = await fetch(backingTrackUrl);
          const arrayBuf = await res.arrayBuffer();
          const backingBuf = await ctx.decodeAudioData(arrayBuf);

          const backingSource = ctx.createBufferSource();
          backingSource.buffer = backingBuf;

          const gainNode = ctx.createGain();
          gainNode.gain.value = backingVolume / 100;
          backingGainNodeRef.current = gainNode;

          backingSource.connect(gainNode);
          gainNode.connect(ctx.destination);

          backingSource.start(startTime);
          activeAudioSourcesRef.current.push(backingSource);
          totalSceneDuration = backingBuf.duration;
        } catch (e) {
          console.warn('Failed to load backing track audio:', e);
        }
      }

      // 4. Play User Dubbed Voice Takes at exact line.timestamp
      packLines.forEach((line, index) => {
        const takeUrl = recordedTakes[index];
        const lineTs = line.timestamp || (index * 3.0);
        const lineDur = line.duration || 2.4;
        totalSceneDuration = Math.max(totalSceneDuration, lineTs + lineDur);

        if (takeUrl) {
          fetch(takeUrl)
            .then((res) => res.arrayBuffer())
            .then((arrayBuf) => ctx.decodeAudioData(arrayBuf))
            .then((audioBuf) => {
              const source = ctx.createBufferSource();
              source.buffer = audioBuf;

              const gainNode = ctx.createGain();
              gainNode.gain.value = 1.0;

              source.connect(gainNode);
              gainNode.connect(ctx.destination);

              const playAt = startTime + lineTs;
              source.start(playAt);
              activeAudioSourcesRef.current.push(source);

              // Update subtitle display at line.timestamp
              const delayMs = Math.max(0, (playAt - ctx.currentTime) * 1000);
              setTimeout(() => {
                setCurrentActiveLine(line);
              }, delayMs);
            })
            .catch((e) => console.warn(`Take ${index} decode error:`, e));
        } else {
          // Schedule subtitle timer for un-dubbed line
          const delayMs = Math.max(0, (startTime + lineTs - ctx.currentTime) * 1000);
          setTimeout(() => {
            setCurrentActiveLine(line);
          }, delayMs);
        }
      });

      if (totalSceneDuration <= 0) totalSceneDuration = packLines.length * 3.0;

      setTimeout(() => {
        setIsPlaying(false);
        setCurrentActiveLine(null);
      }, (totalSceneDuration + 1.0) * 1000);

    } catch (err) {
      console.warn('Full dub playback error:', err);
      setIsPlaying(false);
    }
  };

  // Export REAL VIDEO FILE (.webm / .mp4) with mixed backing track + user dubbed audio
  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      // Offscreen Canvas for HD Video Rendering (1280x720)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = 1280;
      exportCanvas.height = 720;
      const ctx2d = exportCanvas.getContext('2d');

      const dest = audioCtx.createMediaStreamDestination();
      let totalSceneDuration = 0;

      // Schedule backing track in export audio stream
      if (backingTrackUrl) {
        try {
          const res = await fetch(backingTrackUrl);
          const arrayBuf = await res.arrayBuffer();
          const backingBuf = await audioCtx.decodeAudioData(arrayBuf);

          const backingSource = audioCtx.createBufferSource();
          backingSource.buffer = backingBuf;

          const gainNode = audioCtx.createGain();
          gainNode.gain.value = backingVolume / 100;

          backingSource.connect(gainNode);
          gainNode.connect(dest);

          backingSource.start(audioCtx.currentTime + 0.1);
          totalSceneDuration = backingBuf.duration;
        } catch (e) {
          console.warn('Failed to decode backing track for video export:', e);
        }
      }

      // Schedule user dubbed audio takes in export stream at line.timestamp
      for (let i = 0; i < packLines.length; i++) {
        const line = packLines[i];
        const lineTs = line.timestamp || (i * 3.0);
        const lineDur = line.duration || 2.4;
        totalSceneDuration = Math.max(totalSceneDuration, lineTs + lineDur);

        const takeUrl = recordedTakes[i];
        if (takeUrl) {
          try {
            const res = await fetch(takeUrl);
            const arrayBuf = await res.arrayBuffer();
            const buf = await audioCtx.decodeAudioData(arrayBuf);

            const source = audioCtx.createBufferSource();
            source.buffer = buf;
            source.connect(dest);
            source.start(audioCtx.currentTime + 0.1 + lineTs);
          } catch (e) {
            console.warn(`Failed to decode take ${i} for video export:`, e);
          }
        }
      }

      if (totalSceneDuration <= 0) totalSceneDuration = packLines.length * 3.0;

      // Capture 30 FPS video track + mixed audio stream
      const canvasStream = exportCanvas.captureStream(30);
      const audioTrack = dest.stream.getAudioTracks()[0];

      const combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...(audioTrack ? [audioTrack] : [])
      ]);

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
          mimeType = 'video/webm;codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
          mimeType = 'video/webm;codecs=vp8,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm')) {
          mimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          mimeType = 'video/mp4';
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, { mimeType });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      // Load background scene image for video frames
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      if (packLines[0]?.imageUrl) {
        bgImg.src = packLines[0].imageUrl;
      }

      mediaRecorder.start(100);
      const renderStartMs = performance.now();

      const videoBlob = await new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          const elapsedSec = (performance.now() - renderStartMs) / 1000;
          const progressPct = Math.min(100, Math.round((elapsedSec / totalSceneDuration) * 100));
          setExportProgress(progressPct);

          // Clear background
          ctx2d.fillStyle = '#000000';
          ctx2d.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

          // Draw scene image frame
          if (bgImg.complete && bgImg.naturalWidth > 0) {
            ctx2d.drawImage(bgImg, 0, 0, exportCanvas.width, exportCanvas.height);
          }

          // Draw CRT scanlines overlay
          ctx2d.fillStyle = 'rgba(0, 0, 0, 0.15)';
          for (let y = 0; y < exportCanvas.height; y += 4) {
            ctx2d.fillRect(0, y, exportCanvas.width, 2);
          }

          // Draw Subtitle overlay at exact timestamp
          const activeLine = packLines.find(
            l => elapsedSec >= (l.timestamp || 0) && elapsedSec < ((l.timestamp || 0) + (l.duration || 2.4))
          );

          if (activeLine) {
            // Speaker badge
            ctx2d.fillStyle = '#00F0FF';
            ctx2d.fillRect(exportCanvas.width / 2 - 90, exportCanvas.height - 120, 180, 32);
            ctx2d.fillStyle = '#000000';
            ctx2d.font = 'bold 18px Barlow Condensed, sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.fillText((activeLine.speaker || 'VOICE').toUpperCase(), exportCanvas.width / 2, exportCanvas.height - 98);

            // Subtitle text
            ctx2d.fillStyle = '#FFFFFF';
            ctx2d.font = 'bold 30px sans-serif';
            ctx2d.textAlign = 'center';
            ctx2d.shadowColor = 'rgba(0, 0, 0, 0.9)';
            ctx2d.shadowBlur = 10;
            ctx2d.fillText(activeLine.text || '', exportCanvas.width / 2, exportCanvas.height - 50);
            ctx2d.shadowBlur = 0;
          }

          if (elapsedSec >= totalSceneDuration + 0.5) {
            clearInterval(interval);
            mediaRecorder.stop();
          }
        }, 1000 / 30);

        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: mimeType }));
        };
        mediaRecorder.onerror = (err) => {
          clearInterval(interval);
          reject(err);
        };
      });

      // Trigger Browser Download of REAL VIDEO FILE (.webm / .mp4)
      const downloadUrl = URL.createObjectURL(videoBlob);
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      const filename = `${packTitle.replace(/[^a-zA-Z0-9_\.-]/g, '_')}_full_dub.${extension}`;
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);

    } catch (err) {
      console.error('Export video failed:', err);
      alert('เกิดข้อผิดพลาดในการสร้างไฟล์วิดีโอ: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const firstLine = packLines[0] || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl border border-[oklch(42%_0.01_190)] bg-[oklch(14%_0.01_190)] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              FINAL CUT - FULL MASTER DUB
            </span>
            <h2 className="font-['Bowlby_One_SC'] text-2xl uppercase tracking-wide text-white md:text-3xl">
              {packTitle}
            </h2>
          </div>
          <button
            onClick={() => {
              stopPlayback();
              onClose();
            }}
            className="rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(22%_0.01_190)] p-2 text-gray-300 transition hover:bg-[oklch(30%_0.01_190)] hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Continuous Full Master Video Screen Frame */}
        <div className="relative mb-4 aspect-[2.55/1] w-full overflow-hidden rounded-xl border border-[oklch(35%_0.01_190)] bg-black shadow-inner">
          <div ref={ogvContainerRef} className="h-full w-full flex items-center justify-center" />

          {/* Fallback Image Scene Frame */}
          {!firstLine.videoUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              {currentActiveLine?.imageUrl || firstLine.imageUrl ? (
                <img
                  src={currentActiveLine?.imageUrl || firstLine.imageUrl}
                  alt="Scene"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center text-gray-400">
                  <Tv className="h-12 w-12 text-[var(--cyan)]" />
                  <span className="text-xs font-bold">FULL DUB MASTER PLAYBACK</span>
                </div>
              )}
            </div>
          )}

          {/* Realtime Subtitle Overlay */}
          <div className="absolute bottom-4 left-1/2 z-10 w-[90%] -translate-x-1/2 text-center drop-shadow-md pointer-events-none">
            <span className="inline-block rounded bg-[var(--cyan)] px-2.5 py-0.5 text-[11px] font-extrabold text-black uppercase tracking-wide">
              {currentActiveLine?.speaker || firstLine.speaker || 'VOICE'}
            </span>
            <h2 className="mt-1 text-base font-extrabold text-white md:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {currentActiveLine?.text || firstLine.text || ''}
            </h2>
          </div>
        </div>

        {/* Footer Bar (Matching Screenshot) */}
        <div className="flex flex-col gap-4 rounded-xl border border-[oklch(28%_0.01_190)] bg-[oklch(18%_0.01_190)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)] font-medium">
            Your takes are mixed over the original backing track.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {/* Backing Track Volume Slider */}
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <span>Backing track</span>
              <input
                type="range"
                min="0"
                max="100"
                value={backingVolume}
                onChange={(e) => setBackingVolume(Number(e.target.value))}
                className="h-1.5 w-24 accent-[var(--cyan)] cursor-pointer"
              />
              <span className="w-10 font-mono text-[var(--cyan)]">{backingVolume}%</span>
            </div>

            {/* Replay Button */}
            <button
              onClick={handlePlayFullDub}
              disabled={isPlaying}
              className="flex items-center gap-1.5 rounded-lg border border-[oklch(40%_0.01_190)] bg-[oklch(26%_0.01_190)] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[oklch(34%_0.01_190)] disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 text-[var(--cyan)]" />
              <span>Replay</span>
            </button>

            {/* Export REAL VIDEO FILE Button */}
            <button
              onClick={handleExportVideo}
              disabled={isExporting}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--cyan)] px-4 py-2 text-xs font-extrabold text-black shadow transition hover:brightness-110 disabled:opacity-50"
            >
              <Film className="h-4 w-4" />
              <span>{isExporting ? `Rendering video (${exportProgress}%)...` : '↓ Export video'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
