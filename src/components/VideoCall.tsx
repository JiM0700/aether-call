import React, { useEffect, useRef, useState } from 'react';
import {
  Users,
  Share2,
  Copy,
  Check,
  Sparkles,
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  Server,
} from 'lucide-react';
import type { RemoteParticipant } from '../hooks/useWebRTC';
import type { NetworkTelemetry } from '../hooks/useAdaptiveBitrate';
import type { QualityLevel } from '../utils/presets';
import type { StabilizationMode } from '../utils/stabilization';
import { Controls } from './Controls';
import { StatsHUD } from './StatsHUD';
import { QualityModal } from './QualityModal';
import { DeviceSettings } from './DeviceSettings';
import { ShareModal } from './ShareModal';
import { SignalingModal } from './SignalingModal';

interface VideoCallProps {
  roomId: string;
  userName: string;
  callUrl: string;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  remoteParticipants: Map<string, RemoteParticipant>;
  participantCount: number;
  connectionStatus: string;
  signalingStatus: 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';
  signalingError: string | null;
  signalingUrl: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  quality: QualityLevel;
  stabilizationMode: StabilizationMode;
  isHardwareStabilized: boolean;
  audioLevel: number;
  telemetry: NetworkTelemetry;
  availableDevices: {
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  };
  selectedAudioDeviceId: string;
  selectedVideoDeviceId: string;
  selectedAudioOutputId: string;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onToggleScreenShare: () => void;
  onSelectQuality: (quality: QualityLevel) => void;
  onSelectStabilization: (mode: StabilizationMode) => void;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onSelectAudioOutput: (id: string) => void;
  onLeaveCall: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  roomId,
  callUrl,
  localStream,
  screenStream,
  remoteParticipants,
  participantCount,
  signalingStatus,
  signalingError: _signalingError,
  signalingUrl,
  isAudioMuted,
  isVideoMuted,
  isScreenSharing,
  quality,
  stabilizationMode,
  isHardwareStabilized,
  audioLevel,
  telemetry,
  availableDevices,
  selectedAudioDeviceId,
  selectedVideoDeviceId,
  selectedAudioOutputId,
  onToggleAudio,
  onToggleVideo,
  onFlipCamera,
  onToggleScreenShare,
  onSelectQuality,
  onSelectStabilization,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onSelectAudioOutput,
  onLeaveCall,
}) => {
  const [showStatsHUD, setShowStatsHUD] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSignalingModal, setShowSignalingModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = screenStream || localStream;
    }
  }, [localStream, screenStream]);

  // Attach remote streams & handle iOS autoplay unlock
  useEffect(() => {
    remoteParticipants.forEach((participant, id) => {
      const el = remoteVideoRefs.current.get(id);
      if (el && el.srcObject !== participant.stream) {
        el.srcObject = participant.stream;
        if (selectedAudioOutputId && 'setSinkId' in el && typeof (el as any).setSinkId === 'function') {
          (el as any).setSinkId(selectedAudioOutputId).catch(() => {});
        }
        el.play().catch((err) => {
          console.warn('[VideoCall] Autoplay blocked, awaiting user tap:', err);
          setAudioBlocked(true);
        });
      }
    });
  }, [remoteParticipants, selectedAudioOutputId]);

  // Apply audio output speaker device if setSinkId is supported
  useEffect(() => {
    if (!selectedAudioOutputId) return;
    remoteVideoRefs.current.forEach((el) => {
      if ('setSinkId' in el && typeof (el as any).setSinkId === 'function') {
        (el as any).setSinkId(selectedAudioOutputId).catch((err: any) => {
          console.warn('[VideoCall] Failed to set sinkId on video element:', err);
        });
      }
    });
  }, [selectedAudioOutputId]);

  const handleUnlockAudio = () => {
    remoteVideoRefs.current.forEach((el) => {
      el.play().catch(() => {});
    });
    setAudioBlocked(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(callUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const participantsList = Array.from(remoteParticipants.values());
  const hasRemote = participantsList.length > 0;

  return (
    <div
      onClick={audioBlocked ? handleUnlockAudio : undefined}
      className="relative w-full h-[100dvh] bg-[#05070c] overflow-hidden flex flex-col select-none"
    >
      {/* Top Header Bar */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 md:p-4 safe-pt pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Room Token Badge */}
          <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                signalingStatus === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : signalingStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-slate-300 font-semibold">{roomId}</span>
            {signalingStatus !== 'connected' && (
              <button
                onClick={() => setShowSignalingModal(true)}
                className="text-[10px] text-amber-300 underline font-medium hover:text-amber-200"
              >
                {signalingStatus === 'error' ? 'Server Offline' : signalingStatus}
              </button>
            )}
          </div>

          {/* Participant count */}
          <div className="glass-panel px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300">
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>{participantCount}</span>
          </div>

          {/* Network Health / Ping */}
          <button
            onClick={() => setShowStatsHUD(!showStatsHUD)}
            className="glass-panel px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300 hover:bg-white/10 transition"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.status === 'excellent'
                  ? 'bg-emerald-400'
                  : telemetry.status === 'good'
                  ? 'bg-blue-400'
                  : telemetry.status === 'fair'
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
            />
            <span>{telemetry.rttMs}ms</span>
          </button>
        </div>

        {/* Quick Invite Link */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowSignalingModal(true)}
            title="Signaling Relay Server"
            className="glass-panel px-2.5 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs text-slate-300 hover:bg-white/10 transition"
          >
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Relay</span>
          </button>
          <button
            onClick={() => setShowShareModal(true)}
            className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition shadow-lg"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Invite Link</span>
          </button>
        </div>
      </div>

      {/* iOS Audio Unlock Banner */}
      {audioBlocked && (
        <div className="absolute top-16 inset-x-4 z-40 max-w-md mx-auto p-3 rounded-2xl bg-blue-600 text-white text-xs flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>Tap anywhere to unmute participant audio</span>
          </div>
          <button
            onClick={handleUnlockAudio}
            className="px-2 py-1 bg-white text-blue-600 rounded-lg font-bold"
          >
            Unmute
          </button>
        </div>
      )}

      {/* Active Video Surface */}
      <div className="flex-1 w-full h-full relative">
        {hasRemote ? (
          // Remote Participant Video Grid
          <div
            className={`w-full h-full p-2 md:p-4 grid gap-3 ${
              participantsList.length === 1
                ? 'grid-cols-1'
                : participantsList.length === 2
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-2'
            }`}
          >
            {participantsList.map((participant) => (
              <div
                key={participant.socketId}
                className="relative w-full h-full rounded-3xl overflow-hidden bg-slate-950 border border-white/5 flex items-center justify-center shadow-2xl"
              >
                <video
                  ref={(el) => {
                    if (el) {
                      remoteVideoRefs.current.set(participant.socketId, el);
                      if (el.srcObject !== participant.stream) {
                        el.srcObject = participant.stream;
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  webkit-playsinline="true"
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 glass-pill px-3 py-1 rounded-full text-xs font-medium text-slate-200">
                  {participant.userName}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Waiting or Connecting card
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
            {signalingStatus === 'error' ? (
              <div className="max-w-md w-full glass-panel-elevated p-8 rounded-3xl border border-rose-500/30 space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Signaling Relay Disconnected</h3>
                  <p className="text-xs text-rose-300/80 mt-2 leading-relaxed">
                    Cannot reach the signaling server at <code className="bg-slate-900 px-2 py-0.5 rounded text-white font-mono">{signalingUrl || 'server'}</code>.
                    GitHub Pages is a static host and cannot run WebSockets without an external relay.
                  </p>
                </div>
                <button
                  onClick={() => setShowSignalingModal(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-xl transition"
                >
                  Configure Relay URL / Local Run Guide
                </button>
              </div>
            ) : participantCount > 1 ? (
              <div className="max-w-md w-full glass-panel-elevated p-8 rounded-3xl border border-blue-500/30 space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Connecting Media...</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Participant detected in room! Negotiating direct peer-to-peer connection.
                  </p>
                </div>
              </div>
            ) : (
              // Waiting for peer card
              <div className="max-w-md w-full glass-panel-elevated p-8 rounded-3xl border border-white/10 space-y-5 animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                  <Share2 className="w-8 h-8 animate-pulse-subtle" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Waiting for others to join...</h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    Share this secure link or QR code with another person on iPhone, Android, Mac, or Windows.
                  </p>
                </div>

                {/* Quick Copy Box */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/80 border border-white/10">
                  <span className="text-xs text-slate-300 font-mono truncate px-2">
                    {callUrl}
                  </span>
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 transition"
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Show QR Code for instant mobile scanning
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Local Self-View (Picture-in-Picture) */}
        <div
          className={`absolute z-20 transition-all duration-200 ${
            hasRemote
              ? 'bottom-20 right-4 w-32 md:w-56 aspect-[3/4] md:aspect-video rounded-2xl overflow-hidden glass-panel-elevated border-2 border-white/20 shadow-2xl'
              : 'bottom-20 right-4 w-28 md:w-44 aspect-[3/4] md:aspect-video rounded-2xl overflow-hidden glass-panel border border-white/10'
          }`}
        >
          {isVideoMuted || !localStream ? (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-slate-500 text-xs">
              Camera Off
            </div>
          ) : (
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted
              className={`w-full h-full object-cover ${!isScreenSharing ? 'mirror' : ''}`}
            />
          )}

          {/* Local overlay badge */}
          <div className="absolute bottom-1.5 left-2 glass-pill px-2 py-0.5 rounded-full text-[10px] text-slate-200 flex items-center gap-1">
            <span>You</span>
            {isAudioMuted && <VolumeX className="w-3 h-3 text-rose-400" />}
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <Controls
        isAudioMuted={isAudioMuted}
        isVideoMuted={isVideoMuted}
        isScreenSharing={isScreenSharing}
        quality={quality}
        audioLevel={audioLevel}
        showStatsHUD={showStatsHUD}
        onToggleAudio={onToggleAudio}
        onToggleVideo={onToggleVideo}
        onFlipCamera={onFlipCamera}
        onToggleScreenShare={onToggleScreenShare}
        onOpenQualityModal={() => setShowQualityModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onToggleStatsHUD={() => setShowStatsHUD(!showStatsHUD)}
        onOpenShareModal={() => setShowShareModal(true)}
        onHangUp={onLeaveCall}
      />

      {/* Floating Overlays & Modals */}
      {showStatsHUD && (
        <StatsHUD
          telemetry={telemetry}
          isHardwareStabilized={isHardwareStabilized}
          onClose={() => setShowStatsHUD(false)}
        />
      )}

      {showQualityModal && (
        <QualityModal
          currentQuality={quality}
          onSelectQuality={onSelectQuality}
          onClose={() => setShowQualityModal(false)}
        />
      )}

      {showSettingsModal && (
        <DeviceSettings
          availableDevices={availableDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          selectedVideoDeviceId={selectedVideoDeviceId}
          selectedAudioOutputId={selectedAudioOutputId}
          stabilizationMode={stabilizationMode}
          isHardwareStabilized={isHardwareStabilized}
          onSelectAudioDevice={onSelectAudioDevice}
          onSelectVideoDevice={onSelectVideoDevice}
          onSelectAudioOutput={onSelectAudioOutput}
          onSelectStabilization={onSelectStabilization}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showShareModal && (
        <ShareModal callUrl={callUrl} onClose={() => setShowShareModal(false)} />
      )}

      {showSignalingModal && (
        <SignalingModal
          currentUrl={signalingUrl}
          onSave={(url) => {
            if (url) {
              localStorage.setItem('aether_signaling_url', url);
            } else {
              localStorage.removeItem('aether_signaling_url');
            }
          }}
          onClose={() => setShowSignalingModal(false)}
        />
      )}
    </div>
  );
};
