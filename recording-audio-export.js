const positiveSeconds = (value) => {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
};

export const recordingTimelineDuration = ({
  videoDuration = 0,
  backingDuration = 0,
  preferBacking = false,
  takes = [],
} = {}) => {
  const video = positiveSeconds(videoDuration);
  const backing = positiveSeconds(backingDuration);
  if (preferBacking && backing) return backing;
  if (video) return video;
  if (backing) return backing;
  return Math.max(0, ...takes.map(({ start = 0, buffer }) => (
    Math.max(0, Number(start) || 0) + positiveSeconds(buffer?.duration)
  )));
};

const scheduledBuffer = (kind, buffer, start, timelineDuration, lineIndex = null) => {
  const sourceDuration = positiveSeconds(buffer?.duration);
  const requestedStart = Number.isFinite(Number(start)) ? Number(start) : 0;
  const when = Math.max(0, requestedStart);
  const offset = Math.max(0, -requestedStart);
  const duration = Math.min(sourceDuration - offset, timelineDuration - when);
  if (!sourceDuration || duration <= 0 || when >= timelineDuration) return null;
  return { kind, buffer, when, offset, duration, lineIndex };
};

export const createRecordingSchedule = ({ duration, backing = null, takes = [] } = {}) => {
  const timelineDuration = positiveSeconds(duration);
  if (!timelineDuration) return [];
  return [
    scheduledBuffer('backing', backing, 0, timelineDuration),
    ...takes.map(({ lineIndex = null, start = 0, buffer }) => (
      scheduledBuffer('take', buffer, start, timelineDuration, lineIndex)
    )),
  ].filter(Boolean);
};

const writeAscii = (view, offset, value) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

export const audioBufferToWav = (buffer) => {
  const channelCount = Math.max(1, Number(buffer?.numberOfChannels) || 0);
  const frameCount = Math.max(1, Number(buffer?.length) || 0);
  const sampleRate = Math.max(1, Number(buffer?.sampleRate) || 48_000);
  const dataBytes = frameCount * channelCount * 2;
  if (dataBytes > 0xffffffff - 36) throw new Error('This recording is too long to export as a WAV file.');

  const bytes = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(bytes);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channelCount * 2, true);
  view.setUint16(32, channelCount * 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  const channels = Array.from({ length: channelCount }, (_, index) => buffer.getChannelData(index));
  let byteOffset = 44;
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = Math.max(-1, Math.min(1, Number(channels[channel][frame]) || 0));
      view.setInt16(byteOffset, sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767), true);
      byteOffset += 2;
    }
  }
  return new Blob([bytes], { type: 'audio/wav' });
};

export const renderRecordingWav = async ({
  OfflineAudioContext,
  duration,
  backing = null,
  takes = [],
  sampleRate = backing?.sampleRate || takes[0]?.buffer?.sampleRate || 48_000,
} = {}) => {
  if (typeof OfflineAudioContext !== 'function') throw new Error('Full audio export is not supported by this browser.');
  const timelineDuration = positiveSeconds(duration);
  if (!timelineDuration) throw new Error('The full recording duration could not be determined.');
  const outputRate = Math.max(8_000, Math.min(96_000, Math.round(Number(sampleRate) || 48_000)));
  const frameCount = Math.max(1, Math.round(timelineDuration * outputRate));
  const sourceChannels = [backing, ...takes.map(({ buffer }) => buffer)]
    .reduce((maximum, buffer) => Math.max(maximum, Number(buffer?.numberOfChannels) || 0), 1);
  const channelCount = Math.min(2, sourceChannels);
  const context = new OfflineAudioContext(channelCount, frameCount, outputRate);
  const schedule = createRecordingSchedule({ duration: frameCount / outputRate, backing, takes });
  schedule.forEach((entry) => {
    const source = context.createBufferSource();
    source.buffer = entry.buffer;
    source.connect(context.destination);
    source.start(entry.when, entry.offset, entry.duration);
  });
  const rendered = await context.startRendering();
  return {
    blob: audioBufferToWav(rendered),
    duration: rendered.duration,
    sampleRate: rendered.sampleRate,
    channelCount: rendered.numberOfChannels,
    scheduledTakeCount: schedule.filter(({ kind }) => kind === 'take').length,
  };
};
