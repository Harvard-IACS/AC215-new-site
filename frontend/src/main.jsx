import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import { pageForPath } from './pages';
import { siteUrl } from './site-url';

// Each URL is also a complete static HTML file. Load only its interactive page.
async function start() {
  const page = pageForPath(window.location.pathname);
  if (page.id === 'home' && window.location.hash === '#timeline') {
    window.location.replace(siteUrl('/milestones.html'));
    return;
  }
  document.title = page.title;
  document.querySelector('meta[name="description"]').content = page.description;
  const { default: Page } = await (page.id === 'home' ? import('./home-page') : page.id === 'milestones' ? import('./milestones-page') : page.kind === 'milestone' ? import('./milestone-page') : import('./course-pages'));
  const root = document.getElementById('root');
  const app = <App Page={Page} page={page} />;
  if (root.hasChildNodes()) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
start();
