import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths so the Electron file:// protocol can load assets correctly
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
