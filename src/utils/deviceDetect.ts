export interface DeviceCapabilities {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isMac: boolean;
  isSafari: boolean;
  canShareScreen: boolean;
  canSetSinkId: boolean;
  hasHardwareStabilizationSupport: boolean;
}

let _cached: DeviceCapabilities | null = null;

export function detectDevice(): DeviceCapabilities {
  if (_cached) return _cached;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
  const isMobile = isIOS || isAndroid || /Mobi|Mini|webOS|BlackBerry/i.test(ua);
  const isMac = /Macintosh|Mac OS X/.test(ua) && !isIOS;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  const canShareScreen = typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getDisplayMedia === 'function' &&
    !isIOS; // iOS Safari blocks getDisplayMedia in normal camera apps

  const canSetSinkId = typeof window !== 'undefined' &&
    'HTMLMediaElement' in window &&
    'setSinkId' in HTMLMediaElement.prototype;

  let hasHardwareStabilizationSupport = false;
  if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getSupportedConstraints) {
    const supported = navigator.mediaDevices.getSupportedConstraints() as any;
    hasHardwareStabilizationSupport = !!(supported?.videoStabilizationMode || supported?.stabilizationMode);
  }

  const result: DeviceCapabilities = {
    isMobile,
    isIOS,
    isAndroid,
    isMac,
    isSafari,
    canShareScreen,
    canSetSinkId,
    hasHardwareStabilizationSupport,
  };
  _cached = result;
  return result;
}
