import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Check if we're running in StackBlitz
const isStackBlitz = process.env.STACKBLITZ === 'true';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
  },
  // Optimize for StackBlitz environment
  server: {
    hmr: {
      // Optimize HMR for StackBlitz
      clientPort: isStackBlitz ? 443 : undefined,
    },
  },
  // Define alternative entry points
  build: {
    // Minimize CSS in production builds
    cssMinify: true,
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      // Use the standard entry point
      input: resolve(__dirname, 'index.html'),
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/analytics'],
        },
      },
    },
  },
});
