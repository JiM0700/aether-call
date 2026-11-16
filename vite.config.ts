import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Check if SSL is enabled (defaults to true for camera/mic access across mobile devices on LAN)
const useSsl = process.env.VITE_SSL !== 'false';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(useSsl ? [basicSsl()] : []),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
