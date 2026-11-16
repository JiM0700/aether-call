import React, { useState, useEffect, useCallback } from 'react';
import { useMediaStream } from './hooks/useMediaStream';
import { useWebRTC } from './hooks/useWebRTC';
import { useAdaptiveBitrate } from './hooks/useAdaptiveBitrate';
import { RoomLobby } from './components/RoomLobby';
import { VideoCall } from './components/VideoCall';
import {
  generateSecureRoomId,
  generateClientSecretKey,
  createShareableCallUrl,
  parseCallUrl,
} from './utils/crypto';
import type { QualityLevel } from './utils/presets';

export const App: React.FC = () => {
  const [userName, setUserName] = useState<string>('Guest');
  const [isInCall, setIsInCall] = useState<boolean>(false);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [clientKey, setClientKey] = useState<string | null>(null);

  // Initialize Media Stream Hook
  const {
    localStream,
    screenStream,
    isAudioMuted,
    isVideoMuted,
    isScreenSharing,
    quality,
    setQuality,
    stabilizationMode,
    setStabilization,
    isHardwareStabilized,
    audioLevel,
    availableDevices,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    startStream,
    toggleAudio,
    toggleVideo,
    flipCamera,
    toggleScreenShare,
  } = useMediaStream({
    initialQuality: 'auto',
    initialStabilization: 'high',
  });

  // Check URL on startup
  useEffect(() => {
    const { roomId, secretKey } = parseCallUrl();
    if (roomId) {
      setCurrentRoomId(roomId);
      setClientKey(secretKey || generateClientSecretKey());
    }
  }, []);

  // Initialize preview stream when lobby mounts
  useEffect(() => {
    if (!isInCall) {
      startStream('720p').catch((err) => {
        console.warn('Lobby initial camera request failed:', err);
      });
    }
  }, [isInCall, startStream]);

  // Initialize WebRTC
  const {
    remoteParticipants,
    connectionStatus,
    participantCount,
    peerConnections,
  } = useWebRTC({
    roomId: isInCall ? currentRoomId : null,
    userName,
    localStream,
    screenStream,
  });

  // Initialize Adaptive Bitrate & Network Telemetry
  const telemetry = useAdaptiveBitrate({
    peerConnections,
    quality,
    enabled: isInCall,
  });

  // Start or Join a Call
  const handleStartCall = useCallback(() => {
    let roomId = currentRoomId;
    let secret = clientKey;

    if (!roomId) {
      roomId = generateSecureRoomId();
      secret = generateClientSecretKey();
      setCurrentRoomId(roomId);
      setClientKey(secret);
    }

    if (!secret) {
      secret = generateClientSecretKey();
      setClientKey(secret);
    }

    // Update browser URL without reloading
    const fullUrl = createShareableCallUrl(roomId, secret);
    window.history.pushState(null, '', fullUrl);

    setIsInCall(true);
  }, [currentRoomId, clientKey]);

  // Leave Call
  const handleLeaveCall = useCallback(() => {
    setIsInCall(false);
    window.history.pushState(null, '', '/');
    setCurrentRoomId(null);
    setClientKey(null);
  }, []);

  // Keyboard shortcuts (Desktop)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        toggleAudio();
      } else if (e.key === 'v' || e.key === 'V') {
        toggleVideo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleAudio, toggleVideo]);

  const currentCallUrl = currentRoomId && clientKey
    ? createShareableCallUrl(currentRoomId, clientKey)
    : typeof window !== 'undefined'
    ? window.location.href
    : '';

  return (
    <div className="w-full h-full bg-[#070a12] text-slate-100 font-sans">
      {!isInCall ? (
        <RoomLobby
          roomId={currentRoomId}
          userName={userName}
          localStream={localStream}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          stabilizationMode={stabilizationMode}
          isHardwareStabilized={isHardwareStabilized}
          audioLevel={audioLevel}
          onSetUserName={setUserName}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onSetStabilization={setStabilization}
          onStartCall={handleStartCall}
        />
      ) : (
        <VideoCall
          roomId={currentRoomId || ''}
          userName={userName}
          callUrl={currentCallUrl}
          localStream={localStream}
          screenStream={screenStream}
          remoteParticipants={remoteParticipants}
          participantCount={participantCount}
          connectionStatus={connectionStatus}
          isAudioMuted={isAudioMuted}
          isVideoMuted={isVideoMuted}
          isScreenSharing={isScreenSharing}
          quality={quality}
          stabilizationMode={stabilizationMode}
          isHardwareStabilized={isHardwareStabilized}
          audioLevel={audioLevel}
          telemetry={telemetry}
          availableDevices={availableDevices}
          selectedAudioDeviceId={selectedAudioDeviceId}
          selectedVideoDeviceId={selectedVideoDeviceId}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onFlipCamera={flipCamera}
          onToggleScreenShare={toggleScreenShare}
          onSelectQuality={(q: QualityLevel) => {
            setQuality(q);
            startStream(q);
          }}
          onSelectStabilization={setStabilization}
          onSelectAudioDevice={setSelectedAudioDeviceId}
          onSelectVideoDevice={setSelectedVideoDeviceId}
          onLeaveCall={handleLeaveCall}
        />
      )}
    </div>
  );
};
