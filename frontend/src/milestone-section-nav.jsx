import { useLayoutEffect, useRef } from 'react';

export default function MilestoneSectionNav({ className, label, activeSection, children }) {
  const navRef = useRef(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    const current = nav.querySelector('[aria-current="location"]');
    if (!current) return;

    function moveHighlight() {
      nav.style.setProperty('--highlight-x', current.offsetLeft + 'px');
      nav.style.setProperty('--highlight-y', current.offsetTop + 'px');
      nav.style.setProperty('--highlight-width', current.offsetWidth + 'px');
      nav.style.setProperty('--highlight-height', current.offsetHeight + 'px');
    }

    moveHighlight();
    const bounds = nav.getBoundingClientRect();
    const entry = current.getBoundingClientRect();
    nav.scrollBy({
      left: Math.min(0, entry.left - bounds.left) || Math.max(0, entry.right - bounds.right),
      top: Math.min(0, entry.top - bounds.top) || Math.max(0, entry.bottom - bounds.bottom),
    });

    const observer = new ResizeObserver(moveHighlight);
    observer.observe(nav);
    nav.querySelectorAll('a, button').forEach(link => observer.observe(link));
    return () => observer.disconnect();
  }, [activeSection]);

  return <nav ref={navRef} className={className + ' milestone-section-nav'} aria-label={label}>{children}</nav>;
}
