import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupSignaling } from './signaling.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS for cross-origin local network mobile devices & Vite dev server
app.use(cors({ origin: '*' }));
app.use(express.json());

// Socket.io initialization with minimal latency transport
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 10000,
  pingInterval: 5000,
});

// Attach stateless in-memory WebRTC signaling
const { rooms } = setupSignaling(io);

// Health check endpoint (stateless)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    activeRooms: rooms.size,
    timestamp: Date.now(),
  });
});

// Serve static assets in production mode
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[AetherCall] In-memory ephemeral signaling server running on port ${PORT}`);
});
