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
export function createShareableCallUrl(roomId: string, secretKey: string): string {
  const origin = window.location.origin;
  const basePath = getAppBasePath();
  return `${origin}${basePath}/call/${roomId}#key=${secretKey}`;
}

// Parse room ID and hash key from current URL
export function parseCallUrl(): { roomId: string | null; secretKey: string | null } {
  if (typeof window === 'undefined') return { roomId: null, secretKey: null };

  const path = window.location.pathname;
  const match = path.match(/\/call\/([a-zA-Z0-9_-]+)/);
  let roomId = match ? match[1] : null;

  // Support query parameter fallback (e.g. ?room=xyz or ?roomId=xyz)
  if (!roomId && window.location.search) {
    const searchParams = new URLSearchParams(window.location.search);
    roomId = searchParams.get('room') || searchParams.get('roomId') || null;
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

  return { roomId, secretKey };
}
