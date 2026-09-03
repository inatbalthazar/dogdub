import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-local-static',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const urlPath = req.url ? req.url.split('?')[0] : '';
          if (urlPath.startsWith('/vendor/') || urlPath.startsWith('/packs/')) {
            const relativePath = decodeURIComponent(urlPath);
            const filePath = path.join(process.cwd(), relativePath);
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              const ext = path.extname(filePath).toLowerCase();
              const mimeTypes = {
                '.js': 'text/javascript',
                '.wasm': 'application/wasm',
                '.json': 'application/json',
                '.css': 'text/css',
                '.zip': 'application/zip',
                '.ogv': 'video/ogg',
                '.ogg': 'audio/ogg',
                '.mp3': 'audio/mpeg',
                '.wav': 'audio/wav',
                '.mp4': 'video/mp4',
                '.webm': 'video/webm',
                '.png': 'image/png',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.webp': 'image/webp',
              };
              if (mimeTypes[ext]) {
                res.setHeader('Content-Type', mimeTypes[ext]);
              }
              return fs.createReadStream(filePath).pipe(res);
            }
          }
          next();
        });
      }
    }
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server is not running on http://localhost:3000' }));
            }
          });
        }
      },
      '/packs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Pack file not found locally or on backend server');
            }
          });
        }
      },
      '/vendor': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('Vendor asset not found');
            }
          });
        }
      }
    }
  }
});

