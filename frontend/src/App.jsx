import { siteUrl } from './site-url';
import { useState } from 'react';
import { Menu, MessageCircle } from 'lucide-react';
import { ThemeControls } from './theme-controls';
import CourseGuideComponent from './course-guide';
import { DISCUSSION_URL, LECTURES_URL } from './data/course';
import { homePage, pages } from './pages';

const CourseGuide = import.meta.env.VITE_ENABLE_CHAT === 'true' ? CourseGuideComponent : null;

const primaryLinks = [homePage, ...pages];

function PageLinks({ current, primary = false, onNavigate }) {
  return (primary ? primaryLinks : pages).map(page => <a key={page.id} href={siteUrl(page.path)} aria-current={current === page.id ? 'page' : undefined} onClick={onNavigate}>{page.label}</a>);
}

export default function App({ Page, page }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [initialQuestion, setInitialQuestion] = useState('');
  function openGuide(question = '') { setInitialQuestion(question); setGuideOpen(true); }
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header id="top" className="site-header container course-site-header">
      <div className="brand-lockup">
        <span className="seas-brand">
          <img src={siteUrl('/brand/seas-logo.svg#svgView(viewBox(0,14,50,58))')} width="34" height="39" alt="Harvard School of Engineering and Applied Sciences" />
        </span>
        <span className="wordmark">AC 215</span>
      </div>
      <nav aria-label="Course navigation" className="nav-links"><PageLinks current={page.id} primary /></nav>
      <ThemeControls />
      <details className="mobile-navigation" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary').focus(); } }}>
        <summary><Menu aria-hidden="true" /><span>Menu</span></summary>
        <nav aria-label="Mobile course navigation"><PageLinks current={page.id} primary
          onNavigate={event => { event.currentTarget.closest('details').open = false; }} /></nav>
      </details>
    </header>
    <main id="main" className={page.id === 'home' ? undefined : 'course-page'}><Page page={page} openGuide={CourseGuide ? openGuide : undefined} /></main>
    <footer className="site-footer container">
      <div className="footer-name"><a href={siteUrl('/')}>AC215</a><span>Production AI Systems</span><span>Fall 2026</span></div>
      <nav aria-label="Course resources"><PageLinks current={page.id} /><a href={siteUrl('/readings.html')}>Supplementary readings</a><a href={siteUrl('/#people')}>Teaching staff</a><a href={DISCUSSION_URL} target="_blank" rel="noreferrer">Discussion on Ed</a><a href={LECTURES_URL} target="_blank" rel="noreferrer">Lectures on Ed</a><a href="mailto:ac215harvard@gmail.com">Contact staff</a></nav>
      <p>Harvard John A. Paulson School of Engineering and Applied Sciences.</p>
    </footer>
    {CourseGuide ? <><button type="button" className="chat-launcher" aria-label="Open course chat" aria-expanded={guideOpen} aria-controls="course-chat"
      aria-hidden={guideOpen || undefined} tabIndex={guideOpen ? -1 : undefined} onClick={() => openGuide()}>
      <MessageCircle aria-hidden="true" />
    </button>
    <CourseGuide open={guideOpen} onOpenChange={setGuideOpen} initialQuestion={initialQuestion} /></> : null}
  </>;
}
