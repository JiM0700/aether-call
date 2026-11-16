import { io as Client } from 'socket.io-client';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('🧪 Starting Ephemeral Signaling Server Tests...');

  const serverUrl = 'http://localhost:3001';

  // 1. Verify Health Endpoint
  console.log('\n--- 1. Testing Health Endpoint ---');
  const healthRes = await fetch(`${serverUrl}/health`);
  const healthJson = await healthRes.json();
  console.log('Health check response:', healthJson);
  if (healthJson.status !== 'ok') {
    throw new Error('Health check status is not ok');
  }
  console.log('✅ Health check passed.');

  // 2. Client A and Client B connection
  console.log('\n--- 2. Testing In-Memory Room Lifecycle & Multi-Peer Handshake ---');
  const testRoomId = 'test-room-' + Date.now();

  const clientA = Client(serverUrl, { transports: ['websocket'] });
  const clientB = Client(serverUrl, { transports: ['websocket'] });

  await new Promise<void>((resolve, reject) => {
    let aJoined = false;
    let bJoined = false;

    clientA.on('connect', () => {
      console.log('Client A connected:', clientA.id);
      clientA.emit('join-room', { roomId: testRoomId, userName: 'User A' });
    });

    clientA.on('existing-users', (users: any[]) => {
      console.log('Client A received existing-users:', users);
      aJoined = true;
      if (aJoined && bJoined) resolve();
    });

    clientA.on('user-joined', ({ socketId, userName }: any) => {
      console.log(`Client A notified: User B (${userName}, ${socketId}) joined!`);
      // Relay signal test
      clientA.emit('signal', {
        to: socketId,
        type: 'offer',
        data: { sdp: 'fake-sdp-offer', type: 'offer' },
      });
    });

    clientB.on('connect', () => {
      console.log('Client B connected:', clientB.id);
      setTimeout(() => {
        clientB.emit('join-room', { roomId: testRoomId, userName: 'User B' });
      }, 200);
    });

    clientB.on('existing-users', (users: any[]) => {
      console.log('Client B received existing-users:', users);
      bJoined = true;
    });

    clientB.on('signal', ({ from, type, data }: any) => {
      console.log(`Client B received signal '${type}' from ${from}:`, data);
      if (type === 'offer') {
        clientB.emit('signal', {
          to: from,
          type: 'answer',
          data: { sdp: 'fake-sdp-answer', type: 'answer' },
        });
      }
    });

    clientA.on('signal', ({ from, type, data }: any) => {
      console.log(`Client A received signal '${type}' from ${from}:`, data);
      if (type === 'answer') {
        console.log('✅ Full WebRTC signaling exchange verified!');
        resolve();
      }
    });

    setTimeout(() => reject(new Error('Signaling test timed out')), 8000);
  });

  // 3. Testing Zero-Storage Auto-Purge
  console.log('\n--- 3. Testing Zero-Storage Memory Purge ---');
  clientA.disconnect();
  clientB.disconnect();

  // Wait 500ms for server to process disconnects
  await new Promise((r) => setTimeout(r, 500));

  const postHealthRes = await fetch(`${serverUrl}/health`);
  const postHealthJson = await postHealthRes.json();
  console.log('Post-disconnect health check:', postHealthJson);

  if (postHealthJson.activeRooms === 0) {
    console.log('✅ Room successfully purged from memory (activeRooms = 0). Zero persistence confirmed!');
  } else {
    throw new Error(`Expected 0 active rooms, found ${postHealthJson.activeRooms}`);
  }

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
