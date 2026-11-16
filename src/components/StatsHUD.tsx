import React from 'react';
import type { NetworkTelemetry } from '../hooks/useAdaptiveBitrate';
import { Activity, ShieldCheck, Zap, HardDrive, Video } from 'lucide-react';

interface StatsHUDProps {
  telemetry: NetworkTelemetry;
  isHardwareStabilized: boolean;
  onClose: () => void;
}

export const StatsHUD: React.FC<StatsHUDProps> = ({
  telemetry,
  isHardwareStabilized,
  onClose,
}) => {
  const getStatusColor = (status: NetworkTelemetry['status']) => {
    switch (status) {
      case 'excellent':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'good':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'fair':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'poor':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    }
  };

  return (
    <div className="fixed top-16 left-4 z-40 max-w-sm w-full glass-panel-elevated p-4 rounded-2xl border text-xs shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-slate-200">Real-Time Call Telemetry</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white px-2 py-0.5 rounded-lg hover:bg-white/10 transition"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-3">
        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Latency (RTT)</div>
          <div className="text-base font-bold text-slate-100 flex items-center gap-1.5">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                telemetry.rttMs < 120 ? 'bg-emerald-400' : telemetry.rttMs < 250 ? 'bg-amber-400' : 'bg-rose-400'
              }`}
            />
            {telemetry.rttMs} ms
          </div>
        </div>

        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Packet Loss</div>
          <div className="text-base font-bold text-slate-100">
            {telemetry.packetLossPercent}%
          </div>
        </div>

        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">Bitrate</div>
          <div className="text-base font-bold text-slate-100">
            {telemetry.bitrateKbps} kbps
          </div>
        </div>

        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
          <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">FPS / Res</div>
          <div className="text-base font-bold text-slate-100">
            {telemetry.fps} fps · {telemetry.resolution}
          </div>
        </div>
      </div>

      {/* Security & Features badges */}
      <div className="space-y-1.5 pt-2 border-t border-white/5 text-[11px]">
        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security & E2EE:
          </span>
          <span className="font-medium text-emerald-400">Client-Side Key</span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            Cloud Storage:
          </span>
          <span className="font-medium text-blue-400">Zero (Volatile RAM)</span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Video className="w-3.5 h-3.5 text-purple-400" />
            Device Stabilization:
          </span>
          <span className={`font-medium ${isHardwareStabilized ? 'text-emerald-400' : 'text-purple-400'}`}>
            {isHardwareStabilized ? 'Hardware (OIS/EIS)' : 'Digital Active'}
          </span>
        </div>

        <div className="flex items-center justify-between text-slate-300">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Adaptive Engine:
          </span>
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${getStatusColor(telemetry.status)}`}>
            {telemetry.isAutoActive ? `Auto · ${telemetry.status.toUpperCase()}` : 'Manual Lock'}
          </span>
        </div>
      </div>
    </div>
  );
};
