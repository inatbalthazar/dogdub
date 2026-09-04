/**
 * Progressive Asset Loader & Sliding Window Preloader Service
 * Loads initial metadata and initial 3 audio clips in ~1s, then preloads upcoming lines in background.
 */

class ProgressiveLoader {
  constructor() {
    this.audioBlobCache = new Map(); // key: `${packId}:${lineIndex}` -> Blob Object URL
    this.preloadingQueue = new Set();
    this.currentPackId = null;
    this.currentPackData = null;
  }

  /**
   * Fast load initial metadata + line 0, 1, 2 audio clips.
   * Completes in ~1s.
   * @param {string} packId
   * @param {Function} [onProgress]
   */
  async loadInitial(packId, onProgress) {
    this.currentPackId = packId;
    if (onProgress) onProgress(15, 'Connecting to Progressive Scene Server...');

    const infoRes = await fetch(`/api/packs/${encodeURIComponent(packId)}/progressive/info`);
    if (!infoRes.ok) {
      throw new Error(`Progressive info not available for pack: ${packId}`);
    }

    const data = await infoRes.json();
    if (!data.ok || !data.info || !Array.isArray(data.info.lines)) {
      throw new Error(`Invalid progressive info format for pack: ${packId}`);
    }

    const { info } = data;
    if (onProgress) onProgress(45, 'Loading initial dialogue & audio clips...');

    // Pre-fetch first 3 line audio clips in parallel
    const initialLineIndices = [0, 1, 2].filter((idx) => idx < info.lines.length);
    await Promise.all(initialLineIndices.map((idx) => this.fetchLineAudio(packId, idx)));

    if (onProgress) onProgress(100, 'Ready! Entering Dub Studio...');

    // Construct pack data object compatible with App.jsx
    const videoStreamUrl = `/api/packs/${encodeURIComponent(packId)}/progressive/video`;

    const lines = info.lines.map((line, idx) => ({
      ...line,
      audioUrl: this.getAudioUrl(packId, idx) || `/api/packs/${encodeURIComponent(packId)}/progressive/line/${idx}`,
      videoUrl: videoStreamUrl,
    }));

    this.currentPackData = {
      id: packId,
      title: info.title || 'Scene Pack',
      author: info.author || 'Choicer Voicer',
      description: info.description || '',
      linesCount: lines.length,
      characters: info.characters || [],
      videoUrl: videoStreamUrl,
      isOgvVideo: Boolean(info.isOgvVideo),
      backingTrackUrl: info.hasBackingTrack ? `/api/packs/${encodeURIComponent(packId)}/progressive/backing` : null,
      lines,
    };

    // Trigger sliding window preloading for lines 3..7
    this.preloadAhead(packId, 0, lines.length, 5);

    return this.currentPackData;
  }

  /**
   * Preload upcoming line audio clips in background (sliding window)
   */
  preloadAhead(packId, currentIndex, totalLines, windowSize = 5) {
    if (packId !== this.currentPackId) return;

    for (let i = 1; i <= windowSize; i++) {
      const targetIndex = currentIndex + i;
      if (targetIndex < totalLines && !this.getAudioUrl(packId, targetIndex)) {
        this.fetchLineAudio(packId, targetIndex).catch(() => {});
      }
    }
  }

  /**
   * Fetch line audio clip and store as object URL in cache
   */
  async fetchLineAudio(packId, lineIndex) {
    const key = `${packId}:${lineIndex}`;
    if (this.audioBlobCache.has(key)) {
      return this.audioBlobCache.get(key);
    }
    if (this.preloadingQueue.has(key)) {
      return null;
    }

    this.preloadingQueue.add(key);
    try {
      const url = `/api/packs/${encodeURIComponent(packId)}/progressive/line/${lineIndex}`;
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 100 && !blob.type.includes('html')) {
          const objectUrl = URL.createObjectURL(blob);
          this.audioBlobCache.set(key, objectUrl);

          // Update audioUrl in currentPackData if active
          if (this.currentPackData && this.currentPackData.id === packId && this.currentPackData.lines[lineIndex]) {
            this.currentPackData.lines[lineIndex].audioUrl = objectUrl;
          }

          return objectUrl;
        }
      }
    } catch (e) {
      console.warn(`Progressive preloader failed for line ${lineIndex}:`, e);
    } finally {
      this.preloadingQueue.delete(key);
    }
    return null;
  }

  getAudioUrl(packId, lineIndex) {
    return this.audioBlobCache.get(`${packId}:${lineIndex}`) || null;
  }
}

export const progressiveLoader = new ProgressiveLoader();
