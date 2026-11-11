import { useEffect, useState } from 'react';
import { siteUrl } from './site-url';
import { ArrowUpRight } from 'lucide-react';
import { milestones } from './data/course';
import { milestoneInstructions } from './data/milestone-content';
import MilestoneMarkdown from './milestone-markdown';
import MilestoneSectionNav from './milestone-section-nav';

export default function MilestonePage({ page }) {
  const item = milestones[page.index];
  const instruction = milestoneInstructions[page.index];
  const [activeSection, setActiveSection] = useState(instruction.sections[0].id);

  useEffect(() => {
    const headings = instruction.sections.map(section => document.getElementById(section.id));
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
      setActiveSection(current.id);
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
  }, [instruction]);
  return <div className="container page-content milestone-page">
    <header className="page-intro"><div>
      <p className="milestone-meta">{item.id} <span>Due {item.label}, 10 pm Eastern</span><span>{item.weight}% of course grade</span></p>
      <h1>{instruction.title}</h1>
    </div><a className="text-link" href={siteUrl('/milestones.html')}>All milestones<ArrowUpRight aria-hidden="true" /></a></header>
    <div className="document-layout">
      <MilestoneSectionNav className="page-index" label="Instruction sections" activeSection={activeSection}>
        <p>On this page</p>
        {instruction.sections.map(section => <a key={section.id} href={'#' + section.id} aria-current={section.id === activeSection ? 'location' : undefined}>{section.title}</a>)}
      </MilestoneSectionNav>
      <div className="document-sections">{instruction.sections.map(section => <section key={section.id} className="document-section" aria-labelledby={section.id}>
        <h2 id={section.id} tabIndex={-1}>{section.title}</h2><div className="milestone-prose"><MilestoneMarkdown>{section.body}</MilestoneMarkdown></div>
      </section>)}</div>
    </div>
  </div>;
}
