import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SignalPayload, JoinPayload } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// Enable CORS for cross-origin local network mobile devices & Vite dev server
app.use(cors({ origin: '*' }));
app.use(express.json());

// Stateless In-Memory Store - ZERO DISK / ZERO DATABASE STORAGE
// Purged instantaneously as soon as participants disconnect
const rooms = new Map<string, Set<string>>();
const socketToRoom = new Map<string, string>();
const socketUsernames = new Map<string, string>();

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

io.on('connection', (socket: Socket) => {
  // Join a secure ephemeral room
  socket.on('join-room', ({ roomId, userName }: JoinPayload) => {
    if (!roomId) return;

    // Leave any previous room
    const currentRoom = socketToRoom.get(socket.id);
    if (currentRoom) {
      handleLeave(socket);
    }

    // Join new room
    socket.join(roomId);
    socketToRoom.set(socket.id, roomId);
    if (userName) {
      socketUsernames.set(socket.id, userName);
    }

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const roomSockets = rooms.get(roomId)!;
    // Notify existing peers of new member
    const existingUsers = Array.from(roomSockets).map((id) => ({
      socketId: id,
      userName: socketUsernames.get(id) || 'Participant',
    }));

    roomSockets.add(socket.id);

    // Send the list of existing peers to the joiner
    socket.emit('existing-users', existingUsers);

    // Notify other peers in room
    socket.to(roomId).emit('user-joined', {
      socketId: socket.id,
      userName: userName || 'Participant',
    });
  });

  // Relay WebRTC Offer / Answer / ICE Candidate
  // Server acts purely as a dumb pipe; does not inspect or retain payload
  socket.on('signal', ({ to, type, data }: SignalPayload) => {
    io.to(to).emit('signal', {
      from: socket.id,
      userName: socketUsernames.get(socket.id) || 'Participant',
      type,
      data,
    });
  });

  // Handle explicit leave
  socket.on('leave-room', () => {
    handleLeave(socket);
  });

  // Handle client disconnect
  socket.on('disconnect', () => {
    handleLeave(socket);
  });
});

function handleLeave(socket: Socket) {
  const roomId = socketToRoom.get(socket.id);
  if (!roomId) return;

  socket.leave(roomId);
  socketToRoom.delete(socket.id);
  socketUsernames.delete(socket.id);

  const roomSockets = rooms.get(roomId);
  if (roomSockets) {
    roomSockets.delete(socket.id);

    // Notify remaining peers
    socket.to(roomId).emit('user-left', { socketId: socket.id });

    // Zero-Storage: If no participants remain, purge room from memory immediately
    if (roomSockets.size === 0) {
      rooms.delete(roomId);
    }
  }
}

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
