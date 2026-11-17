import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // TURN relay for symmetric NAT traversal (configure via env vars)
    ...((import.meta as any).env?.VITE_TURN_URL ? [{
      urls: (import.meta as any).env.VITE_TURN_URL as string,
      username: ((import.meta as any).env?.VITE_TURN_USER || '') as string,
      credential: ((import.meta as any).env?.VITE_TURN_CREDENTIAL || '') as string,
    }] : []),
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
  const [signalingStatus, setSignalingStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'disconnected'>('idle');
  const [signalingError, setSignalingError] = useState<string | null>(null);
  const [signalingUrl, setSignalingUrl] = useState<string>('');
  const [participantCount, setParticipantCount] = useState<number>(1);
  const [peerConnectionsVersion, setPeerConnectionsVersion] = useState<number>(0);

  const socketRef = useRef<Socket | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const remoteStreamsRef = useRef<Map<string, MediaStream>>(new Map());
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
    setPeerConnectionsVersion((v) => v + 1);

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('signal', {
          to: targetSocketId,
          type: 'ice-candidate',
          data: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    // Connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC] Peer ${targetSocketId} state:`, pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'failed') {
        // Attempt ICE restart to recover the connection
        console.log(`[WebRTC] Connection failed with ${targetSocketId}, attempting ICE restart...`);
        pc.restartIce();
        pc.createOffer({ iceRestart: true }).then((offer) => {
          pc.setLocalDescription(offer);
          socketRef.current?.emit('signal', {
            to: targetSocketId,
            type: 'offer',
            data: offer,
          });
        }).catch((err) => {
          console.error('[WebRTC] ICE restart failed:', err);
        });
      } else if (pc.connectionState === 'disconnected') {
        setConnectionStatus('connecting');
      }
    };

    // Remote track arrival
    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from ${targetSocketId}:`, event.track.kind);
      // Set playoutDelayHint = 0 for minimum lag buffering if supported
      if ('playoutDelayHint' in event.receiver) {
        try {
          (event.receiver as any).playoutDelayHint = 0;
        } catch (e) {
          // Ignore if unsupported
        }
      }

      let remoteMediaStream = event.streams && event.streams[0];
      if (!remoteMediaStream) {
        let stream = remoteStreamsRef.current.get(targetSocketId);
        if (!stream) {
          stream = new MediaStream();
          remoteStreamsRef.current.set(targetSocketId, stream);
        }
        if (!stream.getTracks().some((t) => t.id === event.track.id)) {
          stream.addTrack(event.track);
        }
        remoteMediaStream = stream;
      } else {
        remoteStreamsRef.current.set(targetSocketId, remoteMediaStream);
      }

      setRemoteParticipants((prev) => {
        const next = new Map(prev);
        const existing = next.get(targetSocketId);
        next.set(targetSocketId, {
          socketId: targetSocketId,
          userName: existing?.userName || targetUserName,
          stream: remoteMediaStream,
        });
        return next;
      });
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

    // Determine signaling server URL
    const envUrl = (import.meta as any).env?.VITE_SIGNALING_URL;
    const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
    const localSavedRelay = typeof window !== 'undefined' ? localStorage.getItem('aether_signaling_url') : null;
    const signalingTarget = envUrl || localSavedRelay || (isGitHubPages ? undefined : undefined);
    const resolvedUrl = signalingTarget || (typeof window !== 'undefined' ? window.location.origin : '');
    setSignalingUrl(resolvedUrl);
    setSignalingStatus('connecting');
    setSignalingError(null);

    // If on GitHub Pages without an explicit relay URL, set immediate clear error status
    if (isGitHubPages && !signalingTarget) {
      setSignalingStatus('error');
      setSignalingError('GitHub Pages requires an external signaling relay server. Please configure one.');
    }

    // Connect to signaling server
    const socket = signalingTarget
      ? io(signalingTarget, {
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
        })
      : io({
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 5,
        });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Signaling] Connected to server, joining room:', roomId);
      setSignalingStatus('connected');
      setSignalingError(null);
      socket.emit('join-room', { roomId, userName });
    });

    socket.on('connect_error', (err) => {
      console.warn('[Signaling] Connection error:', err.message);
      setSignalingStatus('error');
      setSignalingError(err.message || 'Failed to connect to signaling server');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Signaling] Disconnected:', reason);
      setSignalingStatus('disconnected');
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
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
              console.warn('[WebRTC] addIceCandidate failed:', err);
            });
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
            await pc.addIceCandidate(new RTCIceCandidate(cand)).catch((err) => {
              console.warn('[WebRTC] addIceCandidate failed:', err);
            });
          }
          pendingCandidatesRef.current.delete(from);
        } else if (type === 'ice-candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(data)).catch((err) => {
              console.warn('[WebRTC] addIceCandidate failed:', err);
            });
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
        setPeerConnectionsVersion((v) => v + 1);
      }
      pendingCandidatesRef.current.delete(socketId);
      remoteStreamsRef.current.delete(socketId);

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
      remoteStreamsRef.current.clear();
      setRemoteParticipants(new Map());
      setConnectionStatus('disconnected');
    };
  }, [roomId, userName, createPeerConnection]);

  return {
    remoteParticipants,
    connectionStatus,
    signalingStatus,
    signalingError,
    signalingUrl,
    participantCount,
    peerConnections: peerConnectionsRef.current,
    peerConnectionsVersion,
  };
}
