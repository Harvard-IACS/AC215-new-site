// Runs before the stylesheet, so a saved theme does not flash on page load.
(() => {
  const key = 'ac215-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try { const saved = localStorage.getItem(key); if (['light', 'dark', 'system'].includes(saved)) preference = saved; } catch {}
  const apply = () => {
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.dataset.theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  };
  window.ac215Theme = { set(value) { if (!['light', 'dark', 'system'].includes(value)) return; preference = value; try { localStorage.setItem(key, value); } catch {} apply(); } };
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  apply();
})();
