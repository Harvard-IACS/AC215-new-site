import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { renderDocument } from './scripts/render-document.mjs';

function completeDevPages() {
  return {
    name: 'complete-course-pages',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const pathname = new URL(request.url, 'http://localhost').pathname;
        if (request.method !== 'GET' || !(/\/$|\.html$/.test(pathname))) return next();
        try {
          const { routes, render } = await server.ssrLoadModule('/src/prerender.jsx');
          const localPath = pathname.startsWith(server.config.base) ? '/' + pathname.slice(server.config.base.length) : pathname;
          const path = localPath.replace(/\/index\.html$/, '/');
          const page = routes.find(page => page.path === path || page.aliases?.includes(path));
          if (!page) return next();
          const template = await readFile(new URL('./index.html', import.meta.url), 'utf8');
          const transformed = await server.transformIndexHtml(pathname, template);
          response.statusCode = 200;
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(renderDocument(transformed, page, render(page)));
        } catch (error) {
          server.ssrFixStacktrace(error);
          next(error);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const base = env.VITE_BASE_PATH || '/';
  if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(base)) throw new Error('VITE_BASE_PATH must be a path with a leading and trailing slash.');
  const chatEnabled = env.VITE_ENABLE_CHAT === 'true';
  const proxy = chatEnabled ? { '/api': { target: 'http://127.0.0.1:8000', changeOrigin: false } } : undefined;
  return {
    base,
    plugins: [completeDevPages(), react(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { proxy },
    preview: { proxy },
    build: { sourcemap: false },
  };
});
