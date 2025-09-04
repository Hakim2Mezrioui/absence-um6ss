import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    fs: {
      strict: false
    }
  },
  optimizeDeps: {
    force: true
  },
  cacheDir: '.vite-cache'
});
