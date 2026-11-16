import React from 'react';
import { Settings, Mic, Video, Volume2, Shield, Check } from 'lucide-react';
import type { StabilizationMode } from '../utils/stabilization';
import { detectDevice } from '../utils/deviceDetect';

interface DeviceSettingsProps {
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  };
  selectedAudioDeviceId: string;
  selectedVideoDeviceId: string;
  stabilizationMode: StabilizationMode;
  isHardwareStabilized: boolean;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onSelectStabilization: (mode: StabilizationMode) => void;
  onClose: () => void;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({
  availableDevices,
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  stabilizationMode,
  isHardwareStabilized,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onSelectStabilization,
  onClose,
}) => {
  const { canSetSinkId } = detectDevice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div className="max-w-md w-full glass-panel-elevated rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Device & Stabilization</h3>
              <p className="text-xs text-slate-400">Audio, camera, and sensor stabilization controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Camera Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Video className="w-4 h-4 text-blue-400" />
            Camera Device
          </label>
          <select
            value={selectedVideoDeviceId}
            onChange={(e) => onSelectVideoDevice(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          >
            <option value="">Default Camera</option>
            {availableDevices.videoInputs.map((d, index) => (
              <option key={d.deviceId || index} value={d.deviceId}>
                {d.label || `Camera ${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Microphone Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
            <Mic className="w-4 h-4 text-emerald-400" />
            Microphone Device
          </label>
          <select
            value={selectedAudioDeviceId}
            onChange={(e) => onSelectAudioDevice(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Default Microphone</option>
            {availableDevices.audioInputs.map((d, index) => (
              <option key={d.deviceId || index} value={d.deviceId}>
                {d.label || `Microphone ${index + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Target Device Stabilization */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Shield className="w-4 h-4 text-purple-400" />
              Target Device Stabilization
            </label>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isHardwareStabilized
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
              }`}
            >
              {isHardwareStabilized ? 'Hardware OIS/EIS Active' : 'Digital Active'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Utilizes physical sensor stabilization (OIS/EIS) of your camera hardware to eliminate shaking while moving.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            {(['high', 'standard', 'off'] as StabilizationMode[]).map((mode) => {
              const isSelected = stabilizationMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectStabilization(mode)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                    isSelected
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md shadow-purple-500/10'
                      : 'bg-slate-900/50 border-white/5 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Audio Output routing (if supported) */}
        {canSetSinkId && availableDevices.audioOutputs.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-amber-400" />
              Speaker Output
            </label>
            <select className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500">
              {availableDevices.audioOutputs.map((d, index) => (
                <option key={d.deviceId || index} value={d.deviceId}>
                  {d.label || `Speaker ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-lg shadow-blue-600/20"
        >
          Done
        </button>
      </div>
    </div>
  );
};
