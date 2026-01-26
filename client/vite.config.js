import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the client.  A proxy is configured so that
// requests to `/api` are forwarded to the Express server running on port
// 3001.  This avoids CORS issues during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Vite default port
    strictPort: false, // Allow port fallback if 5173 is in use
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});