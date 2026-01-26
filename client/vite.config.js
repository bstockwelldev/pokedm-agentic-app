import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the client.  A proxy is configured so that
// requests to `/api` are forwarded to the Express server running on port
// 3001.  This avoids CORS issues during development.
// 
// In Docker: uses service name 'server' for inter-container communication
// Locally: uses 'localhost' (set VITE_API_TARGET=http://localhost:3001)
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow external connections (needed for Docker)
    port: 3000, // Match README and docker-compose port mapping
    strictPort: false, // Allow port fallback if 3000 is in use
    proxy: {
      '/api': {
        // Use environment variable if set, otherwise detect Docker vs local
        target: process.env.VITE_API_TARGET || 
                (process.env.DOCKER_ENV === 'true' ? 'http://server:3001' : 'http://localhost:3001'),
        changeOrigin: true,
      },
    },
  },
});