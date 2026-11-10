import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, routes, legacyRedirects, siteUrl } from '../.ssr/prerender.js';
import { renderDocument } from './render-document.mjs';
const page = fileURLToPath(new URL('../dist/index.html', import.meta.url));
const html = await readFile(page, 'utf8');
for (const route of routes) {
  const document = renderDocument(html, route, render(route));
  for (const path of [route.path, ...(route.aliases || [])]) {
    const filename = path.endsWith('/') ? path.slice(1) + 'index.html' : path.slice(1);
    const output = fileURLToPath(new URL('../dist/' + filename, import.meta.url));
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, document);
  }
}
for (const { path, target } of legacyRedirects) {
  const href = siteUrl(target);
  const document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AC215</title><meta http-equiv="refresh" content="0;url=${href}"><script>location.replace(${JSON.stringify(href)})</script></head><body></body></html>`;
  const output = fileURLToPath(new URL('../dist/' + path.slice(1) + 'index.html', import.meta.url));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, document);
}
// Public files are copied by Vite; the error page also needs the Pages prefix.
const errorPage = new URL('../dist/404.html', import.meta.url);
await writeFile(errorPage, (await readFile(errorPage, 'utf8')).replace(/(href|src)="(\/[^\"]*)"/g, (_, attribute, path) => `${attribute}="${siteUrl(path)}"`));
console.log(`Prerendered ${routes.length} complete course pages. Every page works as a static HTML file.`);
