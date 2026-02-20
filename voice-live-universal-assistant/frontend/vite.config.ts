import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/ws': {
        target: 'http://localhost:8765',
        ws: true,
      },
      '/health': 'http://localhost:8765',
      '/config': 'http://localhost:8765',
      '/languages': 'http://localhost:8765',
    },
  },
  build: {
    outDir: 'dist',
  },
});
