import { useState, useEffect, useRef, useCallback } from 'react';
import { QualityLevel } from '../utils/presets';

export interface NetworkTelemetry {
  rttMs: number;
  packetLossPercent: number;
  jitterMs: number;
  bitrateKbps: number;
  fps: number;
  resolution: string;
  status: 'excellent' | 'good' | 'fair' | 'poor';
  isAutoActive: boolean;
}

export interface UseAdaptiveBitrateProps {
  peerConnections: Map<string, RTCPeerConnection>;
  quality: QualityLevel;
  enabled?: boolean;
}

export function useAdaptiveBitrate({
  peerConnections,
  quality,
  enabled = true,
}: UseAdaptiveBitrateProps) {
  const [telemetry, setTelemetry] = useState<NetworkTelemetry>({
    rttMs: 0,
    packetLossPercent: 0,
    jitterMs: 0,
    bitrateKbps: 0,
    fps: 0,
    resolution: '1280x720',
    status: 'good',
    isAutoActive: quality === 'auto',
  });

  const prevBytesSentRef = useRef<number>(0);
  const prevPacketsSentRef = useRef<number>(0);
  const prevPacketsLostRef = useRef<number>(0);
  const prevTimestampRef = useRef<number>(Date.now());
  const pristineStreakRef = useRef<number>(0);

  // Apply bitrate and downscale constraints dynamically to RTCRtpSender
  const adjustEncoding = useCallback(
    async (pc: RTCPeerConnection, maxBitrateKbps: number, scaleDownBy: number = 1) => {
      const senders = pc.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
      if (!videoSender) return;

      try {
        const params = videoSender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }

        params.encodings[0].maxBitrate = maxBitrateKbps * 1000;
        params.encodings[0].scaleResolutionDownBy = scaleDownBy;

        await videoSender.setParameters(params);
      } catch (err) {
        console.warn('[useAdaptiveBitrate] Could not update sender parameters:', err);
      }
    },
    []
  );

  useEffect(() => {
    if (!enabled || peerConnections.size === 0) {
      return;
    }

    const interval = setInterval(async () => {
      // Pick the primary active peer connection
      const pc = peerConnections.values().next().value;
      if (!pc || pc.connectionState !== 'connected') {
        return;
      }

      try {
        const stats = await pc.getStats();
        const now = Date.now();
        const timeDelta = (now - prevTimestampRef.current) / 1000;
        prevTimestampRef.current = now;

        let rtt = 0;
        let jitter = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        let bytesSent = 0;
        let fps = 0;
        let resWidth = 0;
        let resHeight = 0;

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && (report.selected || report.state === 'succeeded')) {
            if (report.currentRoundTripTime !== undefined) {
              rtt = Math.round(report.currentRoundTripTime * 1000);
            }
          }

          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            bytesSent = report.bytesSent || 0;
            packetsSent = report.packetsSent || 0;
            if (report.framesPerSecond !== undefined) {
              fps = Math.round(report.framesPerSecond);
            }
            if (report.frameWidth && report.frameHeight) {
              resWidth = report.frameWidth;
              resHeight = report.frameHeight;
            }
          }

          if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
            if (report.jitter !== undefined) {
              jitter = Math.round(report.jitter * 1000);
            }
          }
        });

        // Compute bitrate
        const bytesDelta = Math.max(0, bytesSent - prevBytesSentRef.current);
        const bitrateKbps = timeDelta > 0 ? Math.round((bytesDelta * 8) / (timeDelta * 1000)) : 0;
        prevBytesSentRef.current = bytesSent;

        // Compute packet loss rate
        const sentDelta = Math.max(0, packetsSent - prevPacketsSentRef.current);
        const lostDelta = Math.max(0, packetsLost - prevPacketsLostRef.current);
        prevPacketsSentRef.current = packetsSent;
        prevPacketsLostRef.current = packetsLost;

        let packetLossPercent = 0;
        if (sentDelta + lostDelta > 0) {
          packetLossPercent = Math.min(100, Math.round((lostDelta / (sentDelta + lostDelta)) * 100));
        }

        // Determine health status
        let status: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
        if (rtt < 100 && packetLossPercent <= 1) {
          status = 'excellent';
        } else if (rtt < 220 && packetLossPercent <= 3) {
          status = 'good';
        } else if (rtt < 400 || packetLossPercent <= 8) {
          status = 'fair';
        } else {
          status = 'poor';
        }

        // AUTO ADAPTATION LOGIC
        if (quality === 'auto') {
          if (packetLossPercent > 8 || rtt > 450) {
            // Severe congestion: aggressively throttle to avoid frozen screen or disconnect
            pristineStreakRef.current = 0;
            adjustEncoding(pc, 300, 2.5);
          } else if (packetLossPercent > 3 || rtt > 220) {
            // Moderate congestion: step down resolution & bitrate
            pristineStreakRef.current = 0;
            adjustEncoding(pc, 800, 1.5);
          } else if (status === 'excellent' || status === 'good') {
            // Pristine network: increase quality if condition remains steady
            pristineStreakRef.current += 1;
            if (pristineStreakRef.current >= 4) {
              adjustEncoding(pc, 2500, 1);
            }
          }
        }

        setTelemetry({
          rttMs: rtt,
          packetLossPercent,
          jitterMs: jitter,
          bitrateKbps,
          fps,
          resolution: resWidth && resHeight ? `${resWidth}x${resHeight}` : 'Dynamic',
          status,
          isAutoActive: quality === 'auto',
        });
      } catch (err) {
        console.warn('[useAdaptiveBitrate] Stats collection failed:', err);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [enabled, peerConnections, quality, adjustEncoding]);

  return telemetry;
}
