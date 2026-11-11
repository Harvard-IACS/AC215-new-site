import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useActiveSection(sections) {
  const [trackedId, setTrackedId] = useState(sections[0]?.id);

  useEffect(() => {
    const headings = sections.map(section => document.getElementById(section.id)).filter(Boolean);
    if (!headings.length) return;

    const root = document.documentElement;
    let readingLine;

    function trackSection() {
      let current = headings[0];
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top > readingLine) break;
        current = heading;
      }
      if (window.scrollY > 0 && window.scrollY + window.innerHeight >= root.scrollHeight - 1) {
        current = headings.at(-1);
      }
      setTrackedId(current.id);
    }

    function measureReadingLine() {
      readingLine = (Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0) + 2;
      trackSection();
    }

    measureReadingLine();
    window.addEventListener('scroll', trackSection, { passive: true });
    window.addEventListener('resize', measureReadingLine);
    return () => {
      window.removeEventListener('scroll', trackSection);
      window.removeEventListener('resize', measureReadingLine);
    };
  }, [sections]);

  return sections.some(section => section.id === trackedId) ? trackedId : sections[0]?.id;
}

export default function SectionNav({ className, label, activeSection, children }) {
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
    nav.dataset.highlightReady = '';
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
  }, [activeSection, children]);

  return <nav ref={navRef} className={className + ' section-nav'} aria-label={label}>{children}</nav>;
}
