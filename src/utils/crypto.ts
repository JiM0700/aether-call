/**
 * Cryptographic security helpers for Zero-Storage and Client-Side E2EE
 */

// Detect base path for GitHub Pages (/aether-call) or custom root (/)
export function getAppBasePath(): string {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.startsWith('/aether-call') ? '/aether-call' : '';
}

// Generate a cryptographically random room ID (e.g. "a9f4-bc32-7e1d")
export function generateSecureRoomId(): string {
  const bytes = new Uint8Array(9);
  window.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

// Generate client-side cryptographic secret key for the URL hash
export function generateClientSecretKey(): string {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Build shareable link including the client-side hash key and base path
export function createShareableCallUrl(roomId: string, secretKey: string, relayUrl?: string | null): string {
  const origin = window.location.origin;
  const basePath = getAppBasePath();
  const effectiveRelay = relayUrl || (typeof window !== 'undefined' ? localStorage.getItem('aether_signaling_url') : null);
  const query = effectiveRelay ? `?relay=${encodeURIComponent(effectiveRelay)}` : '';
  return `${origin}${basePath}/call/${roomId}${query}#key=${secretKey}`;
}

// Parse room ID and hash key from current URL
export function parseCallUrl(): { roomId: string | null; secretKey: string | null; relayUrl: string | null } {
  if (typeof window === 'undefined') return { roomId: null, secretKey: null, relayUrl: null };

  const path = window.location.pathname;
  const match = path.match(/\/call\/([a-zA-Z0-9_-]+)/);
  let roomId = match ? match[1] : null;

  let relayUrl: string | null = null;
  // Support query parameter fallback (e.g. ?room=xyz or ?roomId=xyz or ?relay=https://...)
  if (window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    if (!roomId) {
      roomId = searchParams.get('room') || searchParams.get('roomId') || null;
    }
    relayUrl = searchParams.get('relay') || null;
    if (relayUrl) {
      try {
        localStorage.setItem('aether_signaling_url', relayUrl);
      } catch (e) {
        // Ignore localStorage quota errors
      }
    }
  }

  let secretKey: string | null = null;
  const hash = window.location.hash;
  if (hash) {
    const keyMatch = hash.match(/#key=([a-zA-Z0-9]+)/) || hash.match(/[?&#]key=([a-zA-Z0-9]+)/);
    if (keyMatch) {
      secretKey = keyMatch[1];
    }
    // Also support #room=xyz if query was in hash
    if (!roomId) {
      const roomHashMatch = hash.match(/room=([a-zA-Z0-9_-]+)/);
      if (roomHashMatch) {
        roomId = roomHashMatch[1];
      }
    }
  }

  return { roomId, secretKey, relayUrl };
}
