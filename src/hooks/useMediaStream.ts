import { useState, useEffect, useRef, useCallback } from 'react';
import { QualityLevel, QUALITY_PRESETS } from '../utils/presets';
import { StabilizationMode, buildStabilizedVideoConstraints, verifyTrackStabilization } from '../utils/stabilization';

export interface UseMediaStreamProps {
  initialQuality?: QualityLevel;
  initialStabilization?: StabilizationMode;
}

export function useMediaStream({
  initialQuality = '720p',
  initialStabilization = 'high',
}: UseMediaStreamProps = {}) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [quality, setQuality] = useState<QualityLevel>(initialQuality);
  const [stabilizationMode, setStabilizationMode] = useState<StabilizationMode>(initialStabilization);
  const [isHardwareStabilized, setIsHardwareStabilized] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [availableDevices, setAvailableDevices] = useState<{
    audioInputs: MediaDeviceInfo[];
    videoInputs: MediaDeviceInfo[];
    audioOutputs: MediaDeviceInfo[];
  }>({ audioInputs: [], videoInputs: [], audioOutputs: [] });
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const localStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Enumerate input and output devices
  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAvailableDevices({
        audioInputs: devices.filter((d) => d.kind === 'audioinput'),
        videoInputs: devices.filter((d) => d.kind === 'videoinput'),
        audioOutputs: devices.filter((d) => d.kind === 'audiooutput'),
      });
    } catch (err) {
      console.warn('[useMediaStream] Failed to enumerate devices:', err);
    }
  }, []);

  // Setup Audio Analysis for speaking indicator
  const setupAudioMeter = useCallback((stream: MediaStream) => {
    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animFrameRef.current = requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (err) {
      console.warn('[useMediaStream] Audio metering not available:', err);
    }
  }, []);

  // Acquire or re-acquire media stream
  const startStream = useCallback(
    async (
      targetQuality: QualityLevel = quality,
      targetFacing: 'user' | 'environment' = facingMode,
      overrideVideoDeviceId?: string,
      overrideAudioDeviceId?: string,
    ) => {
      try {
        // Stop any current local tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((t) => t.stop());
        }

        const preset = QUALITY_PRESETS[targetQuality === 'auto' ? '720p' : targetQuality];
        const isAudioOnly = targetQuality === 'audio-only';

        // Resolve effective device IDs (overrides beat stale closure state)
        const effectiveAudioDeviceId = overrideAudioDeviceId ?? selectedAudioDeviceId;
        const effectiveVideoDeviceId = overrideVideoDeviceId ?? selectedVideoDeviceId;

        // High clarity audio constraints
        const audioConstraints: MediaTrackConstraints = {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
          ...(effectiveAudioDeviceId ? { deviceId: { exact: effectiveAudioDeviceId } } : {}),
        };

        // Video constraints with target stabilization
        let videoConstraints: MediaTrackConstraints | boolean = false;
        if (!isAudioOnly) {
          const baseVideo: MediaTrackConstraints = {
            width: preset.width ? { ideal: preset.width } : undefined,
            height: preset.height ? { ideal: preset.height } : undefined,
            frameRate: { ideal: preset.frameRate, max: preset.frameRate },
            ...(effectiveVideoDeviceId
              ? { deviceId: { exact: effectiveVideoDeviceId } }
              : { facingMode: targetFacing }),
          };
          videoConstraints = buildStabilizedVideoConstraints(stabilizationMode, baseVideo);
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: videoConstraints,
        });

        localStreamRef.current = stream;
        setLocalStream(stream);

        // Check if video stabilization is supported by hardware
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const isHardware = verifyTrackStabilization(videoTrack);
          setIsHardwareStabilized(isHardware);
        }

        setupAudioMeter(stream);
        await refreshDevices();
        return stream;
      } catch (err) {
        console.error('[useMediaStream] getUserMedia error:', err);
        // Fallback to basic audio/video if constraints were rejected
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
          localStreamRef.current = fallbackStream;
          setLocalStream(fallbackStream);
          setupAudioMeter(fallbackStream);
          return fallbackStream;
        } catch (fallbackErr) {
          console.error('[useMediaStream] Critical error acquiring camera/mic:', fallbackErr);
          throw fallbackErr;
        }
      }
    },
    [quality, facingMode, stabilizationMode, selectedVideoDeviceId, selectedAudioDeviceId, refreshDevices, setupAudioMeter]
  );

  // Toggle Mute Audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsAudioMuted((prev) => !prev);
    }
  }, []);

  // Toggle Mute Video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsVideoMuted((prev) => !prev);
    }
  }, []);

  // Flip Mobile Camera (Front / Rear)
  const flipCamera = useCallback(async () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    setSelectedVideoDeviceId(''); // reset explicit device when flipping
    return await startStream(quality, nextFacing);
  }, [facingMode, quality, startStream]);

  // Screen Sharing
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      return null;
    } else {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        alert('Screen sharing is not supported on this browser or mobile device.');
        return null;
      }
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { max: 30 },
          },
          audio: true,
        });

        // Listen for user stopping share via browser native stop button
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
        };

        setScreenStream(stream);
        setIsScreenSharing(true);
        return stream;
      } catch (err) {
        console.warn('[useMediaStream] Screen share cancelled or rejected:', err);
        return null;
      }
    }
  }, [isScreenSharing, screenStream]);

  // Change stabilization mode
  const setStabilization = useCallback(
    async (mode: StabilizationMode) => {
      setStabilizationMode(mode);
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const constraints = buildStabilizedVideoConstraints(mode, videoTrack.getConstraints());
            await videoTrack.applyConstraints(constraints);
            setIsHardwareStabilized(verifyTrackStabilization(videoTrack));
          } catch (err) {
            console.warn('[useMediaStream] Failed to apply new stabilization mode:', err);
          }
        }
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [screenStream]);

  return {
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
    facingMode,
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
    refreshDevices,
  };
}
