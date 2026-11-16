import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export interface RemoteParticipant {
  socketId: string;
  userName: string;
  stream: MediaStream;
}

export interface UseWebRTCProps {
  roomId: string | null;
  userName?: string;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
}

export function useWebRTC({ roomId, userName = 'Guest', localStream, screenStream }: UseWebRTCProps) {
  const [remoteParticipants, setRemoteParticipants] = useState<Map<string, RemoteParticipant>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');
  const [participantCount, setParticipantCount] = useState<number>(1);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(localStream);
  const screenStreamRef = useRef<MediaStream | null>(screenStream);

  localStreamRef.current = localStream;
  screenStreamRef.current = screenStream;

  // Create a peer connection for a target socket ID
  const createPeerConnection = useCallback((targetSocketId: string, targetUserName: string = 'Participant') => {
    if (peerConnectionsRef.current.has(targetSocketId)) {
      return peerConnectionsRef.current.get(targetSocketId)!;
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerConnectionsRef.current.set(targetSocketId, pc);

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          to: targetSocketId,
          type: 'ice-candidate',
          data: event.candidate,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} state:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        // Handle temporary disconnect
      }
    };

    // Remote track arrival
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetSocketId}:`, event.track.kind);
      const [remoteMediaStream] = event.streams;
      if (remoteMediaStream) {
        // Set playoutDelayHint = 0 for minimum lag buffering if supported
        if ('playoutDelayHint' in event.receiver) {
          try {
            (event.receiver as any).playoutDelayHint = 0;
          } catch (e) {
            // Ignore if unsupported
          }
        }

        setRemoteParticipants((prev) => {
          const next = new Map(prev);
          next.set(targetSocketId, {
            socketId: targetSocketId,
            userName: targetUserName,
            stream: remoteMediaStream,
          });
          return next;
        });
      }
    };

    // Add local tracks (camera or screen share)
    const activeStream = screenStreamRef.current || localStreamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => {
        pc.addTrack(track, activeStream);
      });
    }

    return pc;
  }, []);

  // Update tracks when screen sharing toggles or local camera stream changes
  useEffect(() => {
    const activeStream = screenStream || localStream;
    if (!activeStream) return;

    peerConnectionsRef.current.forEach((pc) => {
      const senders = pc.getSenders();

      activeStream.getTracks().forEach((track) => {
        const sender = senders.find((s) => s.track && s.track.kind === track.kind);
        if (sender) {
          sender.replaceTrack(track).catch((err) => {
            console.warn('[WebRTC] replaceTrack error:', err);
          });
        } else {
          try {
            pc.addTrack(track, activeStream);
          } catch (e) {
            // Track might already be added
          }
        }
      });
    });
  }, [screenStream, localStream]);

  // Main Signaling Lifecycle
  useEffect(() => {
    if (!roomId) return;

    setConnectionStatus('connecting');

    // Connect to signaling server (relative URL for proxy support, or environment)
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Signaling] Connected to server, joining room:', roomId);
      socket.emit('join-room', { roomId, userName });
    });

    // Existing peers in room: we initiate an offer to each of them
    socket.on('existing-users', async (existingUsers: { socketId: string; userName: string }[]) => {
      setParticipantCount(existingUsers.length + 1);

      for (const user of existingUsers) {
        const pc = createPeerConnection(user.socketId, user.userName);
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);

          socket.emit('signal', {
            to: user.socketId,
            type: 'offer',
            data: offer,
          });
        } catch (err) {
          console.error('[WebRTC] Error initiating offer:', err);
        }
      }
    });

    // New user joined: prepare peer connection to receive their offer
    socket.on('user-joined', ({ socketId, userName }: { socketId: string; userName: string }) => {
      console.log('[Signaling] User joined:', socketId, userName);
      setParticipantCount((prev) => prev + 1);
      createPeerConnection(socketId, userName);
    });

    // Incoming signal (Offer, Answer, or ICE Candidate)
    socket.on('signal', async ({ from, type, data, userName: senderName }: any) => {
      let pc = peerConnectionsRef.current.get(from);
      if (!pc) {
        pc = createPeerConnection(from, senderName);
      }

      try {
        if (type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));

          // Process queued ICE candidates
          const queued = pendingCandidatesRef.current.get(from) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current.delete(from);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('signal', {
            to: from,
            type: 'answer',
            data: answer,
          });
        } else if (type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(data));

          // Process queued ICE candidates
          const queued = pendingCandidatesRef.current.get(from) || [];
          for (const cand of queued) {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
          pendingCandidatesRef.current.delete(from);
        } else if (type === 'ice-candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data));
          } else {
            // Queue candidate until remote description is set
            const queue = pendingCandidatesRef.current.get(from) || [];
            queue.push(data);
            pendingCandidatesRef.current.set(from, queue);
          }
        }
      } catch (err) {
        console.error(`[WebRTC] Error handling signal '${type}':`, err);
      }
    });

    // Peer left
    socket.on('user-left', ({ socketId }: { socketId: string }) => {
      console.log('[Signaling] User left:', socketId);
      setParticipantCount((prev) => Math.max(1, prev - 1));

      const pc = peerConnectionsRef.current.get(socketId);
      if (pc) {
        pc.close();
        peerConnectionsRef.current.delete(socketId);
      }
      pendingCandidatesRef.current.delete(socketId);

      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    return () => {
      // Cleanup on unmount or room leave
      socket.emit('leave-room');
      socket.disconnect();

      peerConnectionsRef.current.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      pendingCandidatesRef.current.clear();
      setRemoteParticipants(new Map());
      setConnectionStatus('disconnected');
    };
  }, [roomId, userName, createPeerConnection]);

  return {
    remoteParticipants,
    connectionStatus,
    participantCount,
    peerConnections: peerConnectionsRef.current,
  };
}
