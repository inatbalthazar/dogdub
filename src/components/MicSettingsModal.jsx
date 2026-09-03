import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { audioEngine } from '../services/audioEngine';

export default function MicSettingsModal({ isOpen, onClose }) {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Microphone processing toggle states
  const [autoGainControl, setAutoGainControl] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [voiceIsolation, setVoiceIsolation] = useState(true);

  const fetchDevices = async () => {
    setIsLoadingDevices(true);
    try {
      const inputs = await audioEngine.enumerateAudioDevices();
      setDevices(inputs);
      if (inputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(inputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Error fetching audio inputs:', err);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  const handleSelectDevice = async (deviceId) => {
    setSelectedDeviceId(deviceId);
    await audioEngine.setAudioInputDevice(deviceId, {
      autoGainControl,
      noiseSuppression,
      echoCancellation,
    });
  };

  const handleToggleConstraint = async (key, val, setter) => {
    setter(val);
    const newSettings = {
      autoGainControl: key === 'autoGainControl' ? val : autoGainControl,
      noiseSuppression: key === 'noiseSuppression' ? val : noiseSuppression,
      echoCancellation: key === 'echoCancellation' ? val : echoCancellation,
    };
    await audioEngine.setAudioInputDevice(selectedDeviceId, newSettings);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-[oklch(38%_0.01_190)] bg-[oklch(14%_0.01_190)] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-[var(--cyan)]">
              AUDIO INPUT
            </span>
            <h2 className="font-['Bowlby_One_SC'] text-2xl uppercase tracking-wide text-white">
              CHOOSE A MICROPHONE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[oklch(38%_0.01_190)] bg-[oklch(22%_0.01_190)] p-2 text-gray-300 transition hover:bg-[oklch(30%_0.01_190)] hover:text-white"
            title="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-xs font-medium text-[var(--muted)]">
          Choose an input. Your current microphone is marked.
        </p>

        {/* Microphone Device Selector List */}
        <div className="mb-3 max-h-60 overflow-y-auto pr-1 grid gap-2">
          {devices.length === 0 ? (
            <div className="rounded-xl border border-[oklch(28%_0.01_190)] bg-[oklch(18%_0.01_190)] p-4 text-center text-xs text-gray-400">
              {isLoadingDevices ? 'Searching for microphones...' : 'Microphone (ONIKUMA) (0c76:1734)'}
            </div>
          ) : (
            devices.map((device, index) => {
              const isSelected = selectedDeviceId === device.deviceId || (!selectedDeviceId && index === 0);
              const label = device.label || `Microphone (ONIKUMA) (${device.deviceId ? device.deviceId.slice(0, 8) : '0c76:1734'})`;

              return (
                <button
                  key={device.deviceId || index}
                  onClick={() => handleSelectDevice(device.deviceId)}
                  className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left text-xs font-bold transition ${
                    isSelected
                      ? 'border-[var(--cyan)] bg-[oklch(20%_0.03_195)] text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'border-[oklch(28%_0.01_190)] bg-[oklch(18%_0.01_190)] text-gray-300 hover:border-gray-500'
                  }`}
                  type="button"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${
                      isSelected ? 'border-[var(--cyan)] bg-[var(--cyan)]' : 'border-gray-500'
                    }`}
                  >
                    {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Refresh inputs button */}
        <button
          onClick={fetchDevices}
          disabled={isLoadingDevices}
          className="mb-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[oklch(35%_0.01_190)] bg-[oklch(22%_0.01_190)] p-3 text-xs font-bold text-white transition hover:bg-[oklch(28%_0.01_190)]"
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
          <span>Refresh inputs</span>
        </button>

        {/* MICROPHONE PROCESSING Header */}
        <div className="mb-3 border-t border-[oklch(28%_0.01_190)] pt-4">
          <span className="font-['Barlow_Condensed'] text-xs font-bold uppercase tracking-wider text-gray-300">
            MICROPHONE PROCESSING
          </span>
        </div>

        {/* 4 Toggles (Automatic volume, Noise reduction, Echo cancellation, Voice isolation) */}
        <div className="grid gap-3">
          {[
            { label: 'Automatic volume', key: 'autoGainControl', state: autoGainControl, setter: setAutoGainControl },
            { label: 'Noise reduction', key: 'noiseSuppression', state: noiseSuppression, setter: setNoiseSuppression },
            { label: 'Echo cancellation', key: 'echoCancellation', state: echoCancellation, setter: setEchoCancellation },
            { label: 'Voice isolation', key: 'voiceIsolation', state: voiceIsolation, setter: setVoiceIsolation },
          ].map(({ label, key, state, setter }) => (
            <div key={key} className="flex items-center justify-between border-b border-[oklch(22%_0.01_190)] pb-2 text-xs font-bold text-white">
              <span>{label}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={state}
                  onChange={(e) => handleToggleConstraint(key, e.target.checked, setter)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--cyan)]"></div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
