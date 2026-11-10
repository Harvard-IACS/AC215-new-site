import { Dialog } from '@base-ui/react/dialog';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { milestoneInstructions } from './data/milestone-content';

const MilestoneMarkdown = lazy(() => import('./milestone-markdown'));

export function MilestoneDetail({ item, index }) {
  const titleRef = useRef(null);
  const contentsRef = useRef(null);
  const instruction = milestoneInstructions[index];
  const firstSection = instruction.sections[0].id;
  const [activeSection, setActiveSection] = useState(firstSection);

  useEffect(() => {
    const contents = contentsRef.current;
    const current = contents?.querySelector('[aria-current="location"]');
    if (!current) return;
    const bounds = contents.getBoundingClientRect();
    const entry = current.getBoundingClientRect();
    contents.scrollBy({
      left: Math.min(0, entry.left - bounds.left) || Math.max(0, entry.right - bounds.right),
      top: Math.min(0, entry.top - bounds.top) || Math.max(0, entry.bottom - bounds.bottom),
    });
  }, [activeSection]);

  function trackSection(event) {
    const reading = event.currentTarget;
    const sections = reading.querySelectorAll('.milestone-instruction-section');
    if (!sections.length) return;
    const readingLine = reading.getBoundingClientRect().top + 36;
    let current = 0;
    for (let index = 1; index < sections.length; index++) {
      if (sections[index].getBoundingClientRect().top > readingLine) break;
      current = index;
    }
    if (reading.scrollTop > 0 && reading.scrollTop + reading.clientHeight >= reading.scrollHeight - 1) {
      current = sections.length - 1;
    }
    setActiveSection(instruction.sections[current].id);
  }

  function jump(id) {
    document.getElementById(item.id+'-'+id)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  return <Dialog.Root onOpenChange={open => { if (open) setActiveSection(firstSection); }}>
    <Dialog.Trigger className="milestone-trigger">
      <span className="milestone-id">{item.id}</span><span className="milestone-title">{item.title}</span>
      <time dateTime={item.date}>{item.label}</time><span className="milestone-view">View instructions <ArrowUpRight aria-hidden="true" /></span>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="milestone-backdrop" />
      <Dialog.Popup className="milestone-popup" initialFocus={titleRef}>
        <header className="milestone-modal-header">
          <div><p className="milestone-meta">{item.id} <span>Due {item.label}, 10 pm Eastern</span><span>{item.weight}% of course grade</span></p>
            <Dialog.Title ref={titleRef} tabIndex={-1}>{instruction.title}</Dialog.Title>
            <Dialog.Description className="sr-only">{item.text}</Dialog.Description></div>
          <Dialog.Close className="milestone-close" aria-label="Close milestone instructions"><X aria-hidden="true" /></Dialog.Close>
        </header>
        <div className="milestone-modal-layout">
          <nav ref={contentsRef} className="milestone-contents" aria-label={item.id+' instruction sections'}>{instruction.sections.map(section=><button key={section.id} type="button" aria-current={section.id === activeSection ? 'location' : undefined} onClick={()=>jump(section.id)}>{section.title}</button>)}</nav>
          <div className="milestone-reading" tabIndex={0} aria-label="Milestone instructions" onScroll={trackSection}>
            <Suspense fallback={<p role="status">Loading instructions…</p>}>{instruction.sections.map(section=><section id={item.id+'-'+section.id} key={section.id} className="milestone-instruction-section">
              <h3>{section.title}</h3><div className="milestone-prose"><MilestoneMarkdown>{section.body}</MilestoneMarkdown></div>
            </section>)}</Suspense>
          </div>
        </div>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
