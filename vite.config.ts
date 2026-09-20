import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps every emitted URL relative, so the same `dist/` works on
// GitHub Pages project sites (/<repo>/), user sites (/) and even file://.
//
// `host: '127.0.0.1'` is explicit on purpose: with the default (`localhost`) Node
// may bind the IPv6 loopback `::1` only, and browsers that try `127.0.0.1` first
// then report "localhost refused to connect".
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});
