import { Server, Socket } from 'socket.io';
import type { SignalPayload, JoinPayload } from './types.js';

export function setupSignaling(io: Server) {
  // Stateless In-Memory Store - ZERO DISK / ZERO DATABASE STORAGE
  // Purged instantaneously as soon as participants disconnect
  const rooms = new Map<string, Set<string>>();
  const socketToRoom = new Map<string, string>();
  const socketUsernames = new Map<string, string>();

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

  return { rooms, socketToRoom, socketUsernames };
}
