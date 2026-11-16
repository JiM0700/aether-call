import React, { useEffect, useRef } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  Zap,
  HardDrive,
  ArrowRight,
} from 'lucide-react';
import type { StabilizationMode } from '../utils/stabilization';

interface RoomLobbyProps {
  roomId: string | null;
  userName: string;
  localStream: MediaStream | null;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  stabilizationMode: StabilizationMode;
  isHardwareStabilized: boolean;
  audioLevel: number;
  onSetUserName: (name: string) => void;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSetStabilization: (mode: StabilizationMode) => void;
  onStartCall: () => void;
}

export const RoomLobby: React.FC<RoomLobbyProps> = ({
  roomId,
  userName,
  localStream,
  isAudioMuted,
  isVideoMuted,
  stabilizationMode,
  isHardwareStabilized,
  audioLevel,
  onSetUserName,
  onToggleAudio,
  onToggleVideo,
  onSetStabilization,
  onStartCall,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4 md:p-6 bg-gradient-to-b from-[#090d16] via-[#070a12] to-[#04060a]">
      {/* Top Brand Banner */}
      <div className="flex items-center gap-3 mb-6 md:mb-8">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
          <Video className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            AetherCall
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Zero-Storage
            </span>
          </h1>
          <p className="text-xs text-slate-400">High-Clarity Real-Time Web Calling</p>
        </div>
      </div>

      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Video Preview Box */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-video rounded-3xl overflow-hidden glass-panel-elevated border border-white/10 shadow-2xl bg-slate-950 flex items-center justify-center">
            {isVideoMuted || !localStream ? (
              <div className="flex flex-col items-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center mb-2">
                  <VideoOff className="w-8 h-8 text-slate-600" />
                </div>
                <span className="text-xs font-medium">Camera is turned off</span>
              </div>
            ) : (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror"
              />
            )}

            {/* Quick Preview Controls Overlay */}
            <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3">
              <button
                onClick={onToggleAudio}
                className={`p-3 rounded-2xl transition border ${
                  isAudioMuted
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
                }`}
              >
                {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <button
                onClick={onToggleVideo}
                className={`p-3 rounded-2xl transition border ${
                  isVideoMuted
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                    : 'bg-slate-900/80 text-white border-white/10 hover:bg-slate-800'
                }`}
              >
                {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            </div>

            {/* Stabilization Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full glass-pill text-[11px] text-slate-300">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>
                Stabilization:{' '}
                <strong className={isHardwareStabilized ? 'text-emerald-400' : 'text-purple-300'}>
                  {isHardwareStabilized ? 'Hardware OIS' : stabilizationMode.toUpperCase()}
                </strong>
              </span>
            </div>
          </div>

          {/* Mic Level Indicator */}
          <div className="w-full mt-3 px-2 flex items-center gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <Mic className="w-3.5 h-3.5 text-emerald-400" />
              Mic Test:
            </div>
            <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-75"
                style={{ width: `${isAudioMuted ? 0 : audioLevel}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Join Configuration Form */}
        <div className="md:col-span-5 glass-panel-elevated p-6 rounded-3xl border border-white/10 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {roomId ? 'Ready to Join Call' : 'Start Secure Video Call'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {roomId
                ? 'Your room link has verified end-to-end client encryption.'
                : 'Create an instant ephemeral room with zero-storage architecture.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Your Display Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => onSetUserName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-slate-900/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Stabilization Mode Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Device Stabilization</span>
              <span className="text-[10px] text-purple-400 font-normal">Antishake Engine</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['high', 'standard', 'off'] as StabilizationMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSetStabilization(mode)}
                  className={`py-2 px-2 rounded-xl text-xs font-medium border capitalize transition ${
                    stabilizationMode === mode
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                      : 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Join / Start Button */}
          <button
            onClick={onStartCall}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
          >
            <span>{roomId ? 'Join Call Now' : 'Create & Enter Call'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {/* Feature Pillars */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-slate-900/50 border border-white/5">
              <HardDrive className="w-4 h-4 mx-auto text-blue-400 mb-1" />
              <div className="text-[10px] font-medium text-slate-300">Zero Storage</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/50 border border-white/5">
              <Shield className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
              <div className="text-[10px] font-medium text-slate-300">Client E2EE</div>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/50 border border-white/5">
              <Zap className="w-4 h-4 mx-auto text-amber-400 mb-1" />
              <div className="text-[10px] font-medium text-slate-300">Anti-Lag P2P</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
