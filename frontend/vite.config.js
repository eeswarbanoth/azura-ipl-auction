import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_SOCKET_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    server: {
      // Proxy API and socket requests in dev so they bypass CORS
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          changeOrigin: true,
          ws: true, // WebSocket proxying
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,       // Disable sourcemaps in production build
      chunkSizeWarningLimit: 1000,
    },
  };
});
