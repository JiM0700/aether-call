import React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  Sliders,
  Settings,
  Activity,
  PhoneOff,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { QualityLevel, QUALITY_PRESETS } from '../utils/presets';
import { detectDevice } from '../utils/deviceDetect';

interface ControlsProps {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  quality: QualityLevel;
  audioLevel: number;
  showStatsHUD: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onToggleScreenShare: () => void;
  onOpenQualityModal: () => void;
  onOpenSettingsModal: () => void;
  onToggleStatsHUD: () => void;
  onOpenShareModal: () => void;
  onHangUp: () => void;
}

export const Controls: React.FC<ControlsProps> = ({
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  quality,
  audioLevel,
  showStatsHUD,
  onToggleAudio,
  onToggleVideo,
  onFlipCamera,
  onToggleScreenShare,
  onOpenQualityModal,
  onOpenSettingsModal,
  onToggleStatsHUD,
  onOpenShareModal,
  onHangUp,
}) => {
  const { isMobile, canShareScreen } = detectDevice();
  const currentPreset = QUALITY_PRESETS[quality];

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-center p-3 safe-pb pointer-events-none">
      <div className="glass-panel-elevated rounded-3xl p-2 md:p-3 border border-white/10 shadow-2xl flex items-center gap-1.5 md:gap-2.5 pointer-events-auto max-w-[95vw] overflow-x-auto">
        {/* Microphone Toggle */}
        <div className="relative">
          <button
            onClick={onToggleAudio}
            title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
              isAudioMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-slate-800/80 text-white border border-white/10 hover:bg-slate-700/80'
            }`}
          >
            {isAudioMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          {!isAudioMuted && audioLevel > 15 && (
            <span
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse border-2 border-slate-900"
              style={{ transform: `scale(${1 + audioLevel / 100})` }}
            />
          )}
        </div>

        {/* Video Toggle */}
        <button
          onClick={onToggleVideo}
          title={isVideoMuted ? 'Turn Camera On' : 'Turn Camera Off'}
          className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
            isVideoMuted
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
              : 'bg-slate-800/80 text-white border border-white/10 hover:bg-slate-700/80'
          }`}
        >
          {isVideoMuted ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
        </button>

        {/* Mobile Camera Flip (Front/Rear) */}
        {isMobile && !isVideoMuted && (
          <button
            onClick={onFlipCamera}
            title="Switch to Front / Rear Camera"
            className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-800/80 text-white border border-white/10 hover:bg-slate-700/80 flex items-center justify-center transition"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}

        {/* Screen Share (Desktop only) */}
        {canShareScreen && (
          <button
            onClick={onToggleScreenShare}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
            className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400'
                : 'bg-slate-800/80 text-white border border-white/10 hover:bg-slate-700/80'
            }`}
          >
            <ScreenShare className="w-5 h-5" />
          </button>
        )}

        {/* Quality Selector */}
        <button
          onClick={onOpenQualityModal}
          title="Adjust Video Quality & Auto Mode"
          className="h-11 md:h-12 px-3 rounded-2xl bg-slate-800/80 text-slate-200 border border-white/10 hover:bg-slate-700/80 flex items-center gap-2 transition shrink-0"
        >
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-medium hidden sm:inline">{currentPreset.label.split(' ')[0]}</span>
        </button>

        {/* Device & Stabilization Settings */}
        <button
          onClick={onOpenSettingsModal}
          title="Audio, Camera & Stabilization Settings"
          className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-800/80 text-slate-200 border border-white/10 hover:bg-slate-700/80 flex items-center justify-center transition"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* Live Telemetry Toggle */}
        <button
          onClick={onToggleStatsHUD}
          title="Toggle Real-Time Network & Latency Stats"
          className={`w-11 h-11 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition ${
            showStatsHUD
              ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
              : 'bg-slate-800/80 text-slate-200 border border-white/10 hover:bg-slate-700/80'
          }`}
        >
          <Activity className="w-5 h-5" />
        </button>

        {/* Share Link & QR Code */}
        <button
          onClick={onOpenShareModal}
          title="Share Call Link or QR Code"
          className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-slate-800/80 text-slate-200 border border-white/10 hover:bg-slate-700/80 flex items-center justify-center transition"
        >
          <Share2 className="w-5 h-5" />
        </button>

        <div className="w-[1px] h-6 bg-white/10 mx-0.5" />

        {/* Hang Up Button */}
        <button
          onClick={onHangUp}
          title="Leave Call"
          className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center transition-all shadow-lg shadow-rose-600/30 shrink-0"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
