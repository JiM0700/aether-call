import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { Server as SocketIOServer } from 'socket.io';
import { setupSignaling } from './server/signaling.ts';

// Embedded Vite plugin that attaches WebRTC Socket.IO signaling directly to Vite dev server
function embeddedSignalingPlugin(): Plugin {
  return {
    name: 'embedded-signaling',
    configureServer(server) {
      if (server.httpServer) {
        const io = new SocketIOServer(server.httpServer, {
          cors: { origin: '*' },
          transports: ['websocket', 'polling'],
        });
        setupSignaling(io);
        console.log('[Vite] WebRTC signaling attached directly to dev server');
      }
    },
  };
}

// Check if SSL is enabled (defaults to true for camera/mic access across mobile devices on LAN)
const useSsl = process.env.VITE_SSL !== 'false' && !process.env.GITHUB_PAGES;

// Base path for GitHub Pages or custom domain
const base = process.env.GITHUB_PAGES === 'true' ? '/aether-call/' : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    embeddedSignalingPlugin(),
    ...(useSsl ? [basicSsl()] : []),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});
