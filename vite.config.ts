import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const staticPages = ['/kampoppsett-obos-miniliga-roa'];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'serve-static-pages',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url && staticPages.some(p => req.url === p || req.url === p + '/')) {
            req.url = req.url.replace(/\/?$/, '/index.html');
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
