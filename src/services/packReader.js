import * as fflate from 'fflate';

/**
 * Parses a Scene Pack ZIP buffer or Blob and extracts all audio clips, images, video files, and subtitle metadata.
 * Supports both .ini (Choicer Voicer format) and .txt files, as well as .ogv, .mp4, .ogg, .mp3, and .wav audio/video.
 * @param {ArrayBuffer | Blob} zipData 
 * @param {Function} [onProgress] Progress callback: (percent, statusText)
 * @returns {Promise<Object>} Pack object containing lines, audio URLs, video URL, images, and character metadata.
 */
export async function parseScenePackZip(zipData, onProgress) {
  if (onProgress) onProgress(5, 'Reading ZIP data... 5%');
  const buffer = zipData instanceof Blob ? new Uint8Array(await zipData.arrayBuffer()) : new Uint8Array(zipData);
  
  if (onProgress) onProgress(15, 'Unzipping archive... 15%');
  const unzipped = fflate.unzipSync(buffer);

  let title = 'Scene Pack';
  let author = 'Unknown';
  let description = '';
  let packVideoUrl = null;
  let backingTrackUrl = null;
  let isOgvVideo = false;
  const linesMap = new Map();
  const characters = new Set();

  const totalEntries = Object.keys(unzipped).length || 1;
  let processedCount = 0;

  // First pass: look for video files and backing track audio files
  for (const [filePath, content] of Object.entries(unzipped)) {
    processedCount++;
    if (onProgress && processedCount % 2 === 0) {
      const pct = Math.min(60, Math.round(15 + (processedCount / (totalEntries * 2)) * 45));
      onProgress(pct, `Extracting video & music tracks... ${pct}%`);
    }

    const fileName = filePath.split('/').pop();
    const lower = fileName.toLowerCase();
    if (!fileName || lower.startsWith('.')) continue;

    if (lower === 'dub_video.ogv' || lower === 'video.ogv' || lower.endsWith('_video.ogv')) {
      const blob = new Blob([content], { type: 'video/ogg' });
      packVideoUrl = URL.createObjectURL(blob);
      isOgvVideo = true;
    } else if (lower === 'dub_video.mp4' || lower === 'video.mp4' || lower.endsWith('_video.mp4')) {
      const blob = new Blob([content], { type: 'video/mp4' });
      packVideoUrl = URL.createObjectURL(blob);
      isOgvVideo = false;
    } else if (lower === 'dub_video.webm' || lower === 'video.webm') {
      const blob = new Blob([content], { type: 'video/webm' });
      packVideoUrl = URL.createObjectURL(blob);
      isOgvVideo = false;
    }

    if (lower.includes('backing') && (lower.endsWith('.ogg') || lower.endsWith('.mp3') || lower.endsWith('.wav'))) {
      const mime = lower.endsWith('.ogg') ? 'audio/ogg' : lower.endsWith('.wav') ? 'audio/wav' : 'audio/mp3';
      const blob = new Blob([content], { type: mime });
      backingTrackUrl = URL.createObjectURL(blob);
    }
  }

  // Second pass: metadata and scene lines
  for (const [filePath, content] of Object.entries(unzipped)) {
    processedCount++;
    if (onProgress && processedCount % 2 === 0) {
      const pct = Math.min(99, Math.round(60 + (processedCount / (totalEntries * 2)) * 39));
      onProgress(pct, `Parsing dialogues & audio clips... ${pct}%`);
    }

    const fileName = filePath.split('/').pop();
    const lower = fileName.toLowerCase();

    if (!fileName || lower.startsWith('.')) continue;

    // Check for pack metadata info (.ini or .txt)
    if (lower.endsWith('_pack_info.txt') || lower.endsWith('_pack_info.ini') || lower.endsWith('pack.ini') || lower.endsWith('pack_info.txt')) {
      const text = fflate.strFromU8(content);
      for (const line of text.split('\n')) {
        const [k, ...v] = line.split('=');
        if (k && v.length) {
          const key = k.trim().toLowerCase();
          const val = v.join('=').trim().replace(/^["']|["']$/g, '');
          if (key === 'title') title = val;
          if (key === 'author' || key === 'authors' || key === 'credits') author = val;
          if (key === 'description') description = val;
        }
      }
      continue;
    }

    // Process line assets
    const match = fileName.match(/^(\d+)_?([^.]+)?\.(txt|ini|mp3|ogg|wav|png|jpg|webp)$/i);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const namePart = match[2] ? match[2].trim() : 'VOICE';
      const ext = match[3].toLowerCase();

      if (!linesMap.has(lineNum)) {
        linesMap.set(lineNum, {
          id: lineNum,
          speaker: namePart.toUpperCase(),
          text: '',
          audioUrl: null,
          imageUrl: null,
          videoUrl: packVideoUrl,
          isOgvVideo,
          timestamp: 0,
        });
      }

      const item = linesMap.get(lineNum);
      if (!item.videoUrl && packVideoUrl) {
        item.videoUrl = packVideoUrl;
        item.isOgvVideo = isOgvVideo;
      }

      if (ext === 'txt' || ext === 'ini') {
        const text = fflate.strFromU8(content).trim();
        let captionText = '';
        for (const line of text.split('\n')) {
          const [k, ...v] = line.split('=');
          if (k && v.length) {
            const key = k.trim().toLowerCase();
            const val = v.join('=').trim().replace(/^["']|["']$/g, '');
            if (key === 'caption' || key === 'dialog' || key === 'text') {
              captionText = val;
            } else if (key === 'dub_characters' || key === 'character' || key === 'speaker') {
              const cleanSpeaker = val.replace(/[\[\]"']/g, '').trim();
              if (cleanSpeaker) {
                item.speaker = cleanSpeaker.toUpperCase();
                characters.add(item.speaker);
              }
            } else if (key === 'dub_timestamps' || key === 'timestamp' || key === 'time') {
              const cleanNum = val.replace(/[\[\]"']/g, '').trim();
              const parsedTime = parseFloat(cleanNum);
              if (!isNaN(parsedTime)) {
                item.timestamp = parsedTime;
              }
            }
          }
        }
        item.text = captionText || text;
      } else if (['mp3', 'ogg', 'wav'].includes(ext)) {
        const mimeType = ext === 'ogg' ? 'audio/ogg' : ext === 'wav' ? 'audio/wav' : 'audio/mp3';
        const blob = new Blob([content], { type: mimeType });
        item.audioUrl = URL.createObjectURL(blob);
        item.audioBlob = blob;
      } else if (['png', 'jpg', 'webp'].includes(ext)) {
        const blob = new Blob([content], { type: `image/${ext}` });
        item.imageUrl = URL.createObjectURL(blob);
      }
    }
  }

  // Sort lines by numeric ID
  const lines = Array.from(linesMap.values()).sort((a, b) => a.id - b.id);

  if (onProgress) onProgress(100, 'Pack ready! 100%');

  return {
    title,
    author,
    description,
    videoUrl: packVideoUrl,
    backingTrackUrl,
    isOgvVideo,
    characters: Array.from(characters),
    lines,
    totalLines: lines.length,
  };
}
