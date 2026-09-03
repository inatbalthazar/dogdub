import React, { useState, useEffect, useRef } from 'react';
import { X, Play, ChevronLeft, ChevronRight, Volume2, Film, Plus, PlayCircle } from 'lucide-react';
import { parseScenePackZip } from '../services/packReader';

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

export default function ScenePackPreviewModal({ 
  isOpen, 
  onClose, 
  pack, 
  onStartSolo, 
  onCreateRoom,
  t = {}
}) {
  const [packData, setPackData] = useState(null);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const videoRef = useRef(null);
  const ogvContainerRef = useRef(null);
  const ogvPlayerRef = useRef(null);
  const currentAudioRef = useRef(null);

  useEffect(() => {
    if (isOpen && pack) {
      loadPackDetails();
    } else {
      setPackData(null);
      setCurrentSceneIndex(0);
      stopMedia();
    }
  }, [isOpen, pack]);

  const stopMedia = () => {
    setIsPlayingAudio(false);
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      } catch (e) {}
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch (e) {}
    }
    if (ogvPlayerRef.current) {
      try {
        ogvPlayerRef.current.pause();
      } catch (e) {}
    }
  };

  const [loadPercent, setLoadPercent] = useState(0);

  const loadPackDetails = async () => {
    if (!pack) return;
    setIsLoading(true);
    setLoadPercent(10);
    setCurrentSceneIndex(0);
    try {
      const packUrl = pack.url || `/packs/${pack.id}.zip`;
      const res = await fetch(packUrl);
      if (res.ok) {
        setLoadPercent(35);
        const buffer = await res.arrayBuffer();
        const parsed = await parseScenePackZip(buffer, (pct) => {
          setLoadPercent(Math.max(35, Math.min(100, Math.round(pct))));
        });
        setPackData(parsed);
      }
    } catch (err) {
      console.warn('Failed to load scene pack details for preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const [hasVideoError, setHasVideoError] = useState(false);

  const currentLine = packData?.lines?.[currentSceneIndex] || null;
  const totalLines = packData?.lines?.length || pack?.linesCount || 0;
  const targetVideoUrl = currentLine?.videoUrl || packData?.videoUrl || null;
  const isOgvVideo = Boolean(packData?.isOgvVideo || currentLine?.isOgvVideo);
  const lineTimestamp = currentLine?.timestamp || 0;

  useEffect(() => {
    setHasVideoError(false);
  }, [currentSceneIndex, targetVideoUrl]);

  // Load and mount OGV.js Wasm Video Player when modal opens and video URL is present
  useEffect(() => {
    let isMounted = true;

    if (isOpen && targetVideoUrl) {
      loadOGVLibrary().then((OGVPlayer) => {
        if (!isMounted || !ogvContainerRef.current) return;

        if (!ogvPlayerRef.current) {
          const player = new OGVPlayer({
            options: { basePath: '/vendor/ogv' }
          });
          player.style.width = '100%';
          player.style.height = '100%';
          player.style.objectFit = 'contain';

          ogvContainerRef.current.appendChild(player);
          ogvPlayerRef.current = player;
        }

        if (ogvPlayerRef.current && ogvPlayerRef.current.src !== targetVideoUrl) {
          ogvPlayerRef.current.src = targetVideoUrl;
          ogvPlayerRef.current.currentTime = lineTimestamp || 0;
        }
      }).catch((err) => {
        console.warn('Failed to load ogv.js player engine in preview modal:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetVideoUrl, lineTimestamp, isLoading]);

  // Seek video to scene timestamp when scene index changes
  useEffect(() => {
    stopMedia();
    if (ogvPlayerRef.current && targetVideoUrl) {
      try {
        if (ogvPlayerRef.current.src !== targetVideoUrl) {
          ogvPlayerRef.current.src = targetVideoUrl;
        }
        ogvPlayerRef.current.currentTime = lineTimestamp || 0;
      } catch (e) {}
    }
    if (videoRef.current && targetVideoUrl && !hasVideoError) {
      try {
        videoRef.current.currentTime = lineTimestamp || 0;
      } catch (e) {}
    }
  }, [currentSceneIndex, targetVideoUrl, lineTimestamp, hasVideoError]);

  // Cleanup OGV player on component unmount
  useEffect(() => {
    return () => {
      if (ogvPlayerRef.current) {
        try {
          ogvPlayerRef.current.pause();
          if (ogvPlayerRef.current.parentNode) {
            ogvPlayerRef.current.parentNode.removeChild(ogvPlayerRef.current);
          }
        } catch (e) {}
        ogvPlayerRef.current = null;
      }
    };
  }, []);

  const handlePlayScene = () => {
    stopMedia();
    setIsPlayingAudio(true);

    if (ogvPlayerRef.current && targetVideoUrl) {
      try {
        if (ogvPlayerRef.current.src !== targetVideoUrl) {
          ogvPlayerRef.current.src = targetVideoUrl;
        }
        ogvPlayerRef.current.currentTime = lineTimestamp || 0;
        ogvPlayerRef.current.play();
      } catch (e) {}
    }

    if (videoRef.current && targetVideoUrl && !hasVideoError && !isOgvVideo) {
      try {
        videoRef.current.currentTime = lineTimestamp;
        videoRef.current.play().catch(() => {});
      } catch (e) {}
    }

    if (currentLine?.audioUrl) {
      const audio = new Audio(currentLine.audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => {
        setIsPlayingAudio(false);
        if (videoRef.current) {
          try { videoRef.current.pause(); } catch (e) {}
        }
        if (ogvPlayerRef.current) {
          try { ogvPlayerRef.current.pause(); } catch (e) {}
        }
      };
      audio.onerror = () => setIsPlayingAudio(false);
      audio.play().catch(() => setIsPlayingAudio(false));
    }
  };

  if (!isOpen || !pack) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-view-enter">
      <div className="relative w-full max-w-3xl rounded-2xl border border-[oklch(42%_0.01_190)] bg-[oklch(14%_0.01_190)] p-6 shadow-2xl animate-modal-pop">
        {/* Modal Header */}
        <div className="mb-4 flex items-start justify-between border-b border-[oklch(28%_0.01_190)] pb-4">
          <div>
            <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              SCENE PACK PREVIEW - พรีวิววิดีโอ & เสียงต้นฉบับ
            </span>
            <h2 className="font-['Bowlby_One_SC'] text-2xl uppercase tracking-wide text-white md:text-3xl">
              {pack.title}
            </h2>
            {pack.description && (
              <p className="mt-1 text-xs text-[var(--muted)] line-clamp-2">
                {pack.description}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              stopMedia();
              onClose();
            }}
            className="rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(22%_0.01_190)] p-2 text-gray-300 transition hover:bg-[oklch(30%_0.01_190)] hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scene Preview Viewer Body */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[oklch(28%_0.01_190)] bg-black/50 text-gray-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--cyan)] border-t-transparent" />
            <span className="text-xs font-bold">กำลังโหลดข้อมูลวิดีโอฉากพากย์...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scene Counter & Navigation Bar */}
            <div className="flex items-center justify-between rounded-xl border border-[oklch(28%_0.01_190)] bg-[oklch(18%_0.01_190)] px-4 py-2 text-xs font-bold">
              <span className="text-gray-300">
                ฉากที่ <b className="text-[var(--cyan)] font-mono text-sm">{currentSceneIndex + 1}</b> / {totalLines}
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentSceneIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentSceneIndex <= 0}
                  className="flex items-center gap-1 rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(24%_0.01_190)] px-3 py-1.5 text-white transition hover:bg-[oklch(32%_0.01_190)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>ฉากก่อนหน้า</span>
                </button>

                <button
                  onClick={() => setCurrentSceneIndex((prev) => Math.min(totalLines - 1, prev + 1))}
                  disabled={currentSceneIndex >= totalLines - 1}
                  className="flex items-center gap-1 rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(24%_0.01_190)] px-3 py-1.5 text-white transition hover:bg-[oklch(32%_0.01_190)] disabled:opacity-40"
                >
                  <span>ฉากถัดไป</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Scene Visual & Video Frame */}
            <div className="relative aspect-[2.4/1] w-full overflow-hidden rounded-xl border border-[oklch(35%_0.01_190)] bg-[oklch(12%_0.01_190)] shadow-inner flex items-center justify-center">
              {targetVideoUrl ? (
                <div className="relative h-full w-full flex items-center justify-center">
                  {/* OGV.js Wasm Video Player Container for .ogv video format */}
                  <div 
                    ref={ogvContainerRef} 
                    className="h-full w-full flex items-center justify-center overflow-hidden" 
                  />
                  {/* Native HTML5 Video element fallback for MP4 / WebM */}
                  {!isOgvVideo && !hasVideoError && (
                    <video
                      ref={videoRef}
                      src={targetVideoUrl}
                      playsInline
                      controls
                      onError={() => setHasVideoError(true)}
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  )}
                </div>
              ) : currentLine?.imageUrl ? (
                <div className="relative h-full w-full overflow-hidden flex items-center justify-center">
                  <img
                    src={currentLine.imageUrl}
                    alt={`Scene ${currentSceneIndex + 1}`}
                    className={`h-full w-full object-contain transition-transform duration-500 ${
                      isPlayingAudio ? 'scale-105 filter brightness-110' : 'scale-100'
                    }`}
                  />
                  {isPlayingAudio && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none flex items-center justify-center">
                      <div className="flex items-center gap-1.5 rounded-full border border-[var(--cyan)]/50 bg-black/80 px-4 py-1.5 text-xs font-bold text-[var(--cyan)] shadow-lg animate-pulse">
                        <Volume2 className="h-4 w-4 animate-bounce" />
                        <span>{t.playingAudioOverlay || "Playing original audio..."}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 p-6 text-center text-gray-400">
                  <Film className="h-12 w-12 text-[var(--cyan)]" />
                  <span className="text-xs font-bold text-gray-300">
                    {t.sceneDialogue || "Scene dialogue"} {currentLine?.speaker ? `(${currentLine.speaker})` : ''}
                  </span>
                </div>
              )}

              {/* Subtitle Overlay */}
              <div className="absolute bottom-3 left-1/2 w-[90%] -translate-x-1/2 text-center drop-shadow-md pointer-events-none">
                <span className="inline-block rounded bg-[var(--cyan)] px-2.5 py-0.5 text-[11px] font-extrabold text-black uppercase tracking-wide">
                  {currentLine?.speaker || 'CHARACTER'}
                </span>
                <h3 className="mt-1 text-base font-extrabold text-white md:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {currentLine?.text || `Scene dialogue ${currentSceneIndex + 1}`}
                </h3>
              </div>
            </div>

            {/* Video & Audio Scene Play Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handlePlayScene}
                className="flex items-center gap-2 rounded-xl border border-[var(--cyan)]/40 bg-[var(--cyan)]/15 px-6 py-2.5 text-xs font-extrabold text-[var(--cyan)] transition hover:bg-[var(--cyan)] hover:text-black active:scale-95 shadow-md"
              >
                <PlayCircle className={`h-4 w-4 ${isPlayingAudio ? 'animate-spin text-black' : ''}`} />
                <span>{isPlayingAudio ? (t.playingSceneBtn || 'Playing video & audio...') : (t.playSceneBtn || '▶️ Play Video & Original Audio')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Footer Buttons */}
        <div className="mt-6 flex flex-col gap-3 border-t border-[oklch(28%_0.01_190)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--muted)]">
            {t.chooseMode || "Choose to dub this scene solo or create a room to play with friends."}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                onClose();
                if (onCreateRoom) onCreateRoom(pack);
              }}
              className="flex items-center gap-2 rounded-xl border border-[oklch(40%_0.01_190)] bg-[oklch(24%_0.01_190)] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[oklch(32%_0.01_190)]"
            >
              <Plus className="h-4 w-4 text-[var(--cyan)]" />
              <span>{t.createRoomForThisScene || "Create Room for This Scene"}</span>
            </button>

            <button
              onClick={() => {
                onClose();
                if (onStartSolo) onStartSolo(pack.id, pack.url);
              }}
              className="flex items-center gap-2 rounded-xl bg-[var(--cyan)] px-5 py-2.5 text-xs font-extrabold text-black shadow transition hover:brightness-110"
            >
              <Play className="h-4 w-4 fill-black" />
              <span>{t.startSoloMode || "🚀 Start Dubbing (Solo Mode)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
