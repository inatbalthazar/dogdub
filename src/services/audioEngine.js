import { audioBufferToWav, renderRecordingWav, createRecordingSchedule, recordingTimelineDuration } from '../../recording-audio-export.js';

class AudioEngine {
  constructor() {
    this.audioCtx = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.activeStream = null;
    this.isRecording = false;
    this.selectedDeviceId = '';
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  async requestMicrophone() {
    this.initContext();
    try {
      this.activeStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      return this.activeStream;
    } catch (err) {
      console.error('Failed to get microphone stream:', err);
      throw new Error('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาตรวจสอบสิทธิ์การใช้งานไมโครโฟนในเบราว์เซอร์');
    }
  }

  async enumerateAudioDevices() {
    try {
      if (!this.activeStream) {
        await this.requestMicrophone();
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(d => d.kind === 'audioinput');
    } catch (e) {
      console.warn('Failed to enumerate audio devices:', e);
      return [];
    }
  }

  async setAudioInputDevice(deviceId, constraintsOverride = {}) {
    this.selectedDeviceId = deviceId;
    const audioConstraints = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      autoGainControl: constraintsOverride.autoGainControl ?? true,
      noiseSuppression: constraintsOverride.noiseSuppression ?? true,
      echoCancellation: constraintsOverride.echoCancellation ?? true,
    };

    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
    }

    try {
      this.activeStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });
      return this.activeStream;
    } catch (err) {
      console.warn('Failed to set audio input device, falling back to default mic:', err);
      this.activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return this.activeStream;
    }
  }

  async prepareRecording() {
    await this.requestMicrophone();
    this.recordedChunks = [];
  }

  beginMediaRecorder() {
    if (!this.activeStream) return;
    this.recordedChunks = [];

    let mimeType = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
    }
    this.recordedMimeType = mimeType;

    try {
      this.mediaRecorder = new MediaRecorder(this.activeStream, mimeType ? { mimeType } : undefined);
    } catch (e) {
      this.mediaRecorder = new MediaRecorder(this.activeStream);
    }

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedChunks.push(e.data);
      }
    };

    this.isRecording = true;
    this.mediaRecorder.start(100);
  }

  async startRecording() {
    await this.prepareRecording();
    this.beginMediaRecorder();
  }

  stopRecording() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        this.isRecording = false;
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, { type: this.recordedMimeType || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          return resolve({ blob, url });
        }
        return resolve(null);
      }

      this.mediaRecorder.onstop = () => {
        this.isRecording = false;
        const blob = new Blob(this.recordedChunks, { type: this.recordedMimeType || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        resolve({ blob, url });
      };

      this.mediaRecorder.stop();
    });
  }

  playAudioUrl(url, onEnded) {
    this.initContext();
    const audio = new Audio(url);
    if (onEnded) {
      audio.onended = onEnded;
      audio.onerror = () => onEnded();
    }
    audio.play().catch((err) => {
      console.warn('Audio playback error:', err);
      if (onEnded) onEnded();
    });
    return audio;
  }

  async playRecordedBuffer(url, onEnded) {
    this.initContext();
    try {
      const res = await fetch(url);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await this.audioCtx.decodeAudioData(arrayBuf);

      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(this.audioCtx.destination);

      if (onEnded) {
        source.onended = () => {
          onEnded();
        };
      }

      source.start(0);
      return source;
    } catch (err) {
      console.warn('Failed to play recorded buffer via AudioContext, falling back to Audio element:', err);
      return this.playAudioUrl(url, onEnded);
    }
  }

  async applyVoiceEffect(audioBlob, presetId = 'clean', customOverrides = null) {
    if (!audioBlob) return null;
    if (presetId === 'normal') presetId = 'clean';
    
    const isClean = (presetId === 'clean' || !presetId) && 
      (!customOverrides || (customOverrides.pitch === 0 && customOverrides.tone === 0 && customOverrides.echo === 0));

    if (!window.voiceEffects || isClean) {
      return { blob: audioBlob, url: URL.createObjectURL(audioBlob) };
    }
    try {
      const arrayBuf = await audioBlob.arrayBuffer();
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtxClass();
      
      let audioBuf;
      try {
        audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
      } catch (decodeErr) {
        audioBuf = await new Promise((resolve, reject) => {
          ctx.decodeAudioData(
            arrayBuf.slice(0),
            (decoded) => resolve(decoded),
            (err) => reject(err)
          );
        });
      }

      const samples = audioBuf.getChannelData(0);

      let settings = window.voiceEffects.settingsForPreset(presetId) || window.voiceEffects.settingsForPreset('normal');
      if (customOverrides) {
        settings = {
          ...settings,
          pitch: customOverrides.pitch !== undefined && customOverrides.pitch !== 0 ? customOverrides.pitch : settings.pitch,
          tone: customOverrides.tone !== undefined && customOverrides.tone !== 0 ? customOverrides.tone : settings.tone,
          echo: customOverrides.echo !== undefined && customOverrides.echo !== 0 ? customOverrides.echo : settings.echo,
        };
      }

      console.log(`[AudioEngine] Processing voice effect: ${presetId}`, settings);
      const processed = window.voiceEffects.processTake({ samples: new Float32Array(samples), sampleRate: audioBuf.sampleRate }, settings);

      const outBuf = ctx.createBuffer(1, processed.samples.length, processed.sampleRate);
      outBuf.getChannelData(0).set(processed.samples);

      if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
        ctx.close().catch(() => {});
      }

      const wavBlob = audioBufferToWav(outBuf);
      const processedUrl = URL.createObjectURL(wavBlob);
      console.log(`[AudioEngine] Voice effect applied successfully! Result size: ${wavBlob.size} bytes`);
      return { blob: wavBlob, url: processedUrl };
    } catch (err) {
      console.warn('Failed to apply voice effect:', err);
      return { blob: audioBlob, url: URL.createObjectURL(audioBlob) };
    }
  }

  async exportFullDubWav({ duration = 0, backingBuffer = null, takes = [] } = {}) {
    const OfflineCtxClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OfflineCtxClass) throw new Error('Browser does not support OfflineAudioContext for export.');
    
    return await renderRecordingWav({
      OfflineAudioContext: OfflineCtxClass,
      duration,
      backing: backingBuffer,
      takes,
    });
  }
}

export const audioEngine = new AudioEngine();
export { audioBufferToWav, renderRecordingWav, createRecordingSchedule, recordingTimelineDuration };
