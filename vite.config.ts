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
          if (req.url) {
            const [pathname, query] = req.url.split('?');
            if (staticPages.some(p => pathname === p || pathname === p + '/')) {
              const rewritten = pathname.replace(/\/?$/, '/index.html');
              req.url = query ? `${rewritten}?${query}` : rewritten;
            }
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
