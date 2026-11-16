export type QualityLevel = 'auto' | '4k' | '1080p' | '720p' | '480p' | '360p' | 'audio-only';

export interface QualityPreset {
  id: QualityLevel;
  label: string;
  description: string;
  width?: number;
  height?: number;
  frameRate: number;
  maxBitrateKbps: number; // For RTCRtpSender encodings
}

export const QUALITY_PRESETS: Record<QualityLevel, QualityPreset> = {
  '4k': {
    id: '4k',
    label: '4K Ultra HD',
    description: '3840×2160 @ 30fps (Best for ultra-fast fiber)',
    width: 3840,
    height: 2160,
    frameRate: 30,
    maxBitrateKbps: 6000,
  },
  '1080p': {
    id: '1080p',
    label: '1080p Full HD',
    description: '1920×1080 @ 30fps (Crisp, high clarity)',
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrateKbps: 2800,
  },
  '720p': {
    id: '720p',
    label: '720p HD',
    description: '1280×720 @ 30fps (Balanced, standard)',
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrateKbps: 1400,
  },
  '480p': {
    id: '480p',
    label: '480p Standard',
    description: '854×480 @ 30fps (Low bandwidth / cellular)',
    width: 854,
    height: 480,
    frameRate: 30,
    maxBitrateKbps: 700,
  },
  '360p': {
    id: '360p',
    label: '360p Low Bandwidth',
    description: '640×360 @ 24fps (Saves battery & weak Wi-Fi)',
    width: 640,
    height: 360,
    frameRate: 24,
    maxBitrateKbps: 350,
  },
  'audio-only': {
    id: 'audio-only',
    label: 'Audio Only',
    description: 'Video disabled (Minimal lag on edge data)',
    width: 0,
    height: 0,
    frameRate: 0,
    maxBitrateKbps: 64,
  },
  'auto': {
    id: 'auto',
    label: 'Auto (Network Adaptive)',
    description: 'Dynamically scales resolution & bitrate to eliminate lag',
    frameRate: 30,
    maxBitrateKbps: 2800,
  },
};
