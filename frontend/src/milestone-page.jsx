import { siteUrl } from './site-url';
import { ArrowUpRight } from 'lucide-react';
import { milestones } from './data/course';
import { milestoneInstructions } from './data/milestone-content';
import MilestoneMarkdown from './milestone-markdown';

export default function MilestonePage({ page }) {
  const item = milestones[page.index];
  const instruction = milestoneInstructions[page.index];
  return <div className="container page-content milestone-page">
    <header className="page-intro"><div>
      <p className="milestone-meta">{item.id} <span>Due {item.label}, 10 pm Eastern</span><span>{item.weight}% of course grade</span></p>
      <h1>{instruction.title}</h1>
    </div><a className="text-link" href={siteUrl('/#timeline')}>All milestones<ArrowUpRight aria-hidden="true" /></a></header>
    <div className="document-layout">
      <nav className="page-index" aria-label="Instruction sections"><p>On this page</p>{instruction.sections.map(section => <a key={section.id} href={'#' + section.id}>{section.title}</a>)}</nav>
      <div className="document-sections">{instruction.sections.map(section => <section key={section.id} className="document-section" aria-labelledby={section.id}>
        <h2 id={section.id} tabIndex={-1}>{section.title}</h2><div className="milestone-prose"><MilestoneMarkdown>{section.body}</MilestoneMarkdown></div>
      </section>)}</div>
    </div>
  </div>;
}
