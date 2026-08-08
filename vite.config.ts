import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    allowedHosts: ['.ngrok-free.dev', '.ngrok.io', '.ngrok.app'],
    fs: {
      deny: [path.resolve(__dirname, 'android'), path.resolve(__dirname, 'dist')],
    },
  },
});
