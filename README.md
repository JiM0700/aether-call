# AetherCall 🛡️📹

An ultra-secure, zero-storage real-time video calling web application designed for clarity, zero lag, target device stabilization, and cross-platform compatibility across **iPhone / iPad (iOS Safari), Android (Chrome), macOS, Windows, and Linux**.

---

## 🌟 Key Features

1. **Zero-Storage Cloud Architecture**:
   - Built on an ephemeral, in-memory Node.js + WebSocket signaling relay.
   - Absolutely nothing is stored on disk or in databases (no user records, IP logs, chat transcripts, or media).
   - Rooms self-destruct from volatile RAM the instant participants hang up.

2. **Client-Side End-to-End Encryption (E2EE)**:
   - Call URLs embed client-side cryptographic secret keys in the URL hash (`#key=...`).
   - Because URL hash fragments are never sent to web servers or included in HTTP/WebSocket headers, the cloud server cannot eavesdrop or tamper with your connection.
   - Standard 256-bit DTLS-SRTP encryption on all direct peer-to-peer WebRTC media streams.

3. **Target Device Video Stabilization**:
   - Directly requests hardware Optical / Electronic Image Stabilization (OIS/EIS) via standard browser `videoStabilizationMode: 'standard' | 'high'` camera constraints.
   - Includes digital motion smoothing and boundary clamping so moving or walking with mobile devices remains steady.

4. **Buffer & Lag Elimination**:
   - Direct Peer-to-Peer (P2P) WebRTC connection: zero proxy or relay latency (<50-100ms real-time delay).
   - Uses `playoutDelayHint = 0` to prevent browser media buffering.
   - High-definition Opus audio with echo cancellation, noise suppression, and auto-gain control.

5. **Dynamic Quality Options & Smart Auto Mode**:
   - Presets: **Auto (Network Adaptive)**, **4K Ultra HD**, **1080p FHD**, **720p HD**, **480p SD**, **360p Low Bandwidth**, and **Audio Only**.
   - The **Auto Engine** continuously samples `RTCPeerConnection.getStats()` every 1.5 seconds. If packet loss or RTT rises, it smoothly throttles bitrate and resolution without dropping the call, restoring maximum clarity when the connection recovers.
   - Live **Telemetry HUD**: Displays real-time ping, packet loss %, FPS, bitrate, and resolution.

6. **Universal Device Support**:
   - **iOS Safari / iPhone / iPad**: Configured with `playsinline` attributes, WebKit audio unlock tap handler, front/rear camera switching, and dynamic `100dvh` safe-area layouts.
   - **Android Chrome**: Direct hardware camera stabilization and PWA support.
   - **Desktop**: Full screen sharing (`getDisplayMedia`) with audio, speaker output switching, and keyboard shortcuts (`M` to mute, `V` for video).
   - **Instant QR Code**: 1-click invite modal with a high-contrast QR code for instant mobile handoff.

---

## 🚀 Quick Start

### 1. Start Development Server (Single Command — Embedded Signaling & HTTPS)

```bash
npm run dev
```

The Vite dev server embeds the WebRTC signaling relay directly on port 5173:
- **Local (Desktop)**: `https://localhost:5173/`
- **Network (Mobile / iPhone / Android on same Wi-Fi)**: `https://<your-local-ip>:5173/`

*(When testing on mobile over local Wi-Fi, accept the self-signed developer certificate in your browser).*

---

### 2. Start Production Mode (Single Port Unified Server)

To run the unified Express server serving both the production client bundle and in-memory WebSockets on a single port:

```bash
npm run build
npm run start
```
The application will be accessible at `http://localhost:3001` (or your configured `PORT`).

---

### 3. Deploying with GitHub Pages (Static Frontend + Free Cloud Relay)

GitHub Pages hosts static files and cannot run WebSockets directly. For GitHub Pages deployments:
1. Deploy this repository as a free Web Service on [Render](https://render.com) using the included `render.yaml` (Build: `npm run build`, Start: `npm run start`).
2. In your GitHub Pages app, click **Relay Server** at the top right and enter your Render URL (e.g. `https://your-app.onrender.com`).
3. Any invite links you share will automatically include the relay URL (`?relay=...`), allowing invited participants to connect immediately without any manual configuration!

---

## 🧪 Testing & Verification

Run the automated signaling lifecycle test suite:

```bash
npx tsx test/signaling.test.ts
```

This verifies:
- Signaling server health check.
- Multi-peer in-memory room joining and WebRTC offer/answer handshake.
- Instant room purge from volatile RAM on participant disconnect (Zero-Storage).

---

## 📁 Project Architecture

```
├── package.json
├── vite.config.ts             # Vite configuration with HTTPS & Socket.io proxy
├── server/
│   ├── server.ts              # Stateless in-memory signaling server (Zero Storage)
│   └── types.ts               # Ephemeral event definitions
├── src/
│   ├── App.tsx                # Call coordinator, routing & keyboard shortcuts
│   ├── main.tsx               # Application bootstrap
│   ├── components/
│   │   ├── RoomLobby.tsx      # Pre-call preview, mic meter, stabilization setup
│   │   ├── VideoCall.tsx      # Main video calling interface (grid & mobile PiP)
│   │   ├── Controls.tsx       # Bottom dock (mute, flip camera, screen share, hangup)
│   │   ├── QualityModal.tsx   # Quality selector & auto-mode configuration
│   │   ├── DeviceSettings.tsx # Camera, microphone, speaker, and stabilization mode
│   │   ├── StatsHUD.tsx       # Live latency, loss %, bitrate, and resolution HUD
│   │   └── ShareModal.tsx     # Copy link & high-contrast QR code generator
│   ├── hooks/
│   │   ├── useWebRTC.ts       # Peer connection lifecycle & track exchange
│   │   ├── useMediaStream.ts  # getUserMedia, device stabilization & mic metering
│   │   └── useAdaptiveBitrate.ts # getStats monitoring & dynamic downscaling
│   ├── utils/
│   │   ├── crypto.ts          # URL hash client-side E2EE key derivation
│   │   ├── presets.ts         # Video resolution & bitrate targets
│   │   ├── stabilization.ts   # Hardware OIS/EIS constraint builder
│   │   └── deviceDetect.ts    # Cross-platform device & capability detection
│   └── styles/
│       └── index.css          # Glassmorphism dark theme & safe-area utilities
└── test/
    └── signaling.test.ts      # Automated signaling and memory-purge test suite
```

---

## 🔒 Security & Privacy Model

- **No Database / No Storage**: The signaling server maintains room membership strictly in JavaScript Maps in volatile RAM. As soon as participants leave, the room is deleted.
- **Client-Side Key Hash**: The encryption key is held only after the `#` fragment (`/call/id#key=...`). Browsers never send hash fragments to web servers, guaranteeing zero-knowledge confidentiality.
- **DTLS-SRTP**: WebRTC encrypts all audio and video packets directly between peers using 256-bit AES encryption.
