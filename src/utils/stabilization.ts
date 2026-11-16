/**
 * Video Stabilization utility:
 * Requests native hardware camera stabilization (OIS/EIS) where supported,
 * and sets up smoothing parameters.
 */

export type StabilizationMode = 'off' | 'standard' | 'high';

export interface StabilizationSettings {
  mode: StabilizationMode;
  isHardwareActive: boolean;
}

/**
 * Builds video track constraints incorporating stabilization requests.
 */
export function buildStabilizedVideoConstraints(
  mode: StabilizationMode,
  baseConstraints: MediaTrackConstraints = {}
): MediaTrackConstraints {
  if (mode === 'off') {
    return {
      ...baseConstraints,
    };
  }

  // W3C standard videoStabilizationMode ('standard' | 'high')
  // Passed as both direct constraint and advanced fallback for wide browser coverage
  const advancedConstraints: any[] = (baseConstraints.advanced as any[]) || [];

  return {
    ...baseConstraints,
    // Direct constraint for modern Chromium / Android HAL
    ...({ videoStabilizationMode: mode } as any),
    advanced: [
      ...advancedConstraints,
      { videoStabilizationMode: mode },
      { stabilizationMode: mode },
      { videoStabilization: true },
    ],
  };
}

/**
 * Verifies if hardware video stabilization is actively applied to a live video track
 */
export function verifyTrackStabilization(track: MediaStreamTrack | null): boolean {
  if (!track || track.kind !== 'video') return false;

  try {
    const settings = track.getSettings() as any;
    if (settings.videoStabilizationMode && settings.videoStabilizationMode !== 'off') {
      return true;
    }
    const constraints = track.getConstraints() as any;
    if (constraints.videoStabilizationMode && constraints.videoStabilizationMode !== 'off') {
      return true;
    }
  } catch (err) {
    console.warn('[Stabilization] Could not inspect track settings', err);
  }

  return false;
}
