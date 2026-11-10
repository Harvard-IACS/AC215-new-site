// Vite supplies the deployment prefix for both browser and prerendered markup.
export const siteBase = import.meta.env.BASE_URL;

export function siteUrl(path) {
  return path?.startsWith('/') && !path.startsWith('//') ? siteBase + path.slice(1) : path;
}

export function sitePath(pathname) {
  return siteBase !== '/' && pathname.startsWith(siteBase) ? '/' + pathname.slice(siteBase.length) : pathname;
}
