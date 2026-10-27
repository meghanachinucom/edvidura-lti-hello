import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: process.env.VITE_BASE || '/',
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Moodle (8085) launches the tool in an iframe — allow that frame.
      headers: {
        'Content-Security-Policy':
          "frame-ancestors 'self' http://localhost:8085 http://127.0.0.1:8085",
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/dev': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/lti': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/static': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/health': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/return-to-lms': { target: 'http://127.0.0.1:8000', changeOrigin: true },
        '/return-to-moodle': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      },
    },
  };
});
