import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';
import HomePage from './home-page';
import CoursePages from './course-pages';
import MilestonePage from './milestone-page';
import { homePage, pages, resourcePages } from './pages';
export const routes = [homePage, ...pages, ...resourcePages];
export { legacyRedirects } from './pages';
export { siteUrl } from './site-url';
export function render(page) {
  return renderToString(<App Page={page.id === 'home' ? HomePage : page.kind === 'milestone' ? MilestonePage : CoursePages} page={page} />);
}
