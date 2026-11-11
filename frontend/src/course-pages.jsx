import { siteUrl } from './site-url';
import { useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, ExternalLink, MessageCircle, Search, X } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Input } from '@/components/ui/input';
import { LECTURES_URL } from './data/course';
import manifest from './data/course-pages/pages.json';
import schedule from './data/course-pages/schedule.json';
import policySource from './data/course-pages/policy.md?raw';
import tutorialsSource from './data/course-pages/tutorials.md?raw';
import faqSource from './data/course-pages/faqs.md?raw';
import readingsSource from './data/course-pages/readings.md?raw';

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

function sectionsFrom(markdown, pattern, include = () => true) {
  const headings = [...markdown.matchAll(pattern)].filter(match => include(match[1]));
  return headings.map((heading, index) => ({
    id: slug(heading[1]), title: heading[1],
    body: markdown.slice(heading.index + heading[0].length, headings[index + 1]?.index)
      .replace(/^---\s*$/gm, '').trim(),
  }));
}

const policies = sectionsFrom(policySource, /^#{2,3} (.+)$/gm, title => title !== 'Consent');
const readings = sectionsFrom(readingsSource, /^## (.+)$/gm);
const faqs = sectionsFrom(faqSource, /^### (.+)$/gm).map(item => ({ ...item, number: Number(item.title.match(/^\d+/)[0]), title: item.title.replace(/^\d+\.\s*/, '') }));
const tutorials = sectionsFrom(tutorialsSource, /^## (.+)$/gm).map(item => {
  const number = Number(item.title.match(/^Lecture (\d+)/)[1]);
  const lesson = item.body.match(/^_\[Ed lesson\]\(([^)]+)\)_/);
  return { ...item, id: 'lecture-' + number, number, title: item.title.replace(/^Lecture \d+:\s*/, ''), lesson: lesson?.[1], body: item.body.replace(/^_\[Ed lesson\]\([^)]+\)_\s*/, '') };
});
const months = [{ value: 'all', label: 'All dates' }, { value: '9', label: 'September' }, { value: '10', label: 'October' }, { value: '11', label: 'November' }, { value: '12', label: 'December' }];
const monthNames = { 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec' };

// Keep the source markers, but render them with the site's line-icon system.
function courseCheckMarkers() {
  return function visit(node) {
    const first = node.type === 'listItem' ? node.children[0]?.children?.[0] : null;
    if (first?.type === 'text' && first.value.startsWith('✅')) {
      first.value = first.value.replace(/^✅\s*/u, '');
      node.data = { ...node.data, hProperties: { ...node.data?.hProperties, className: 'course-check-item' } };
    }
    node.children?.forEach(visit);
  };
}

function CourseMarkdown({ children }) {
  return <Markdown remarkPlugins={[remarkGfm, courseCheckMarkers]} components={{
    a: ({ href, children }) => <a href={siteUrl(href)} {...(/^https?:/.test(href || '') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>,
    li: ({ className, children }) => <li className={className}>{className === 'course-check-item' ? <Check className="course-check-icon" aria-hidden="true" /> : null}{children}</li>,
    table: ({ children }) => <div className="page-table-wrap" tabIndex={0} aria-label="Grade distribution table"><table>{children}</table></div>,
    hr: () => null,
  }}>{children}</Markdown>;
}

function PageIntro({ title, children, action }) {
  return <header className="page-intro"><div><h1>{title}</h1>{children ? <p>{children}</p> : null}</div>{action}</header>;
}

function ResourceLink({ href, children }) {
  return <a className="text-link" href={siteUrl(href)} target="_blank" rel="noreferrer">{children}<ExternalLink aria-hidden="true" /></a>;
}

function SearchBox({ value, onChange, label, placeholder }) {
  return <div className="page-search"><Search aria-hidden="true" /><Input type="search" value={value} onChange={event => onChange(event.target.value)} aria-label={label} placeholder={placeholder} />{value ? <button type="button" aria-label={'Clear ' + label.toLowerCase()} onClick={() => onChange('')}><X aria-hidden="true" /></button> : null}</div>;
}

function PageIndex({ items, label = 'On this page' }) {
  return <nav className="page-index" aria-label={label}><p>{label}</p>{items.map(item => <a key={item.id} href={'#' + item.id} title={item.title}>{item.number ? <span className="page-index-number">{String(item.number).padStart(2, '0')}</span> : null}<span className="page-index-label">{item.title}</span></a>)}</nav>;
}

function SchedulePage() {
  const [month, setMonth] = useState('all');
  const rows = schedule.rows.filter(row => month === 'all' || row[1].split('/')[0] === month);
  const liveSchedule = manifest.pages.find(page => page.id === 'schedule').embed;
  function eventTitle(value) {
    // Published event labels keep their meaning, without decorative emoji or capitals.
    return value.trim().replace(/^[🦃⭐\s]+|[🦃⭐\s]+$/gu, '').replace(/^[A-Z\s]+$/, title => title.charAt(0) + title.slice(1).toLowerCase());
  }
  return <div className="container page-content schedule-page">
    <PageIntro title="Schedule." action={<div className="page-actions"><ResourceLink href={liveSchedule.url}>Open live schedule</ResourceLink><ResourceLink href={LECTURES_URL}>Lecture PDFs on Ed</ResourceLink></div>}>Lectures, quizzes, and project milestones.</PageIntro>
    <dl className="meeting-details"><div><dt>When</dt><dd>Tuesday &amp; Thursday <span>12:45–2:45 pm</span></dd></div><div><dt>Where</dt><dd>SEC 1.321 <span>Zoom for Extension students</span></dd></div></dl>
    <div className="schedule-toolbar"><div className="month-filters" role="group" aria-label="Filter schedule by month">{months.map(item => <button key={item.value} type="button" aria-pressed={month === item.value} onClick={() => setMonth(item.value)}>{item.label}</button>)}</div><span>Fall 2026</span></div>
    <div className="schedule-table-wrap"><table className="schedule-table"><caption className="sr-only">Fall 2026 AC215 schedule. Milestone deadlines are at 10 pm Eastern. Blank topics have not been listed in the published schedule.</caption><thead><tr><th scope="col">Week</th><th scope="col">Date</th><th scope="col">Lecture</th><th scope="col">Quizzes &amp; milestones</th></tr></thead><tbody>{rows.map(row => {
      const [week, date, session, topic, quiz, , milestone] = row;
      const [month, day] = date.split('/');
      const topicText = topic.trim();
      const noLecture = topicText === 'No lecture';
      const isEvent = !session.trim() && topicText && !noLecture;
      return <tr key={date} className={isEvent ? 'schedule-event' : undefined}>
        <td className="schedule-week">{week}</td><th scope="row" className="schedule-date"><time dateTime={'2026-' + month.padStart(2, '0') + '-' + day.padStart(2, '0')}>{monthNames[month]} {day}</time></th>
        <td className="schedule-topic">{session.trim() ? <a href={siteUrl('/tutorials.html#lecture-' + session.trim())}><span className="session-number">{session.trim().padStart(2, '0')}</span><span>{topicText}</span><ArrowUpRight aria-hidden="true" /></a> : (
          isEvent ? <span>{eventTitle(topicText)}</span> : <span className="muted">
            <span aria-hidden="true">—</span><span className="sr-only">{noLecture ? 'No lecture' : 'No published topic'}</span>
          </span>
        )}</td>
        <td className="schedule-assessments">{quiz.trim() ? <span>{quiz.trim()}</span> : null}{milestone.trim() ? <a href={siteUrl('/#timeline')}>{milestone.trim()}<ArrowUpRight aria-hidden="true" /></a> : null}</td>
      </tr>;
    })}</tbody></table></div>
    <div className="schedule-footnote"><p>Milestones are due at 10 pm Eastern.</p><a className="text-link" href={siteUrl('/policy.html#policy-on-usage-of-publicly-available-class-material')}>Course material policy<ArrowUpRight aria-hidden="true" /></a></div>
  </div>;
}

function PolicyPage() {
  return <div className="container page-content policy-page">
    <PageIntro title="Course policy." action={<a className="text-link" href="mailto:ac215harvard@gmail.com">Contact staff<ArrowUpRight aria-hidden="true" /></a>}>Grading, expectations, and working together.</PageIntro>
    <div className="document-layout"><PageIndex items={policies} /><div className="document-sections">{policies.map(item => <section className="document-section" key={item.id} aria-labelledby={item.id}><div className="document-section-heading"><h2 id={item.id} tabIndex={-1}>{item.title}</h2></div><div className="course-prose"><CourseMarkdown>{item.body}</CourseMarkdown></div></section>)}</div></div>
  </div>;
}

function TutorialsPage() {
  const [query, setQuery] = useState('');
  const matches = tutorials.filter(item => (item.title + ' ' + item.body).toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="container page-content tutorials-page">
    <PageIntro title="Tutorials." action={<ResourceLink href={LECTURES_URL}>All lessons on Ed</ResourceLink>}>Notebooks, repositories, and demos, organized by lecture.</PageIntro>
    <div className="page-toolbar"><SearchBox value={query} onChange={setQuery} label="Search tutorials" placeholder="Search topics, tools, or tutorials…" /><p role="status">{matches.length} {matches.length === 1 ? 'lecture' : 'lectures'}</p></div>
    <div className="document-layout"><PageIndex items={matches} label="Lectures" /><div className="document-sections">{matches.length ? matches.map(item => <section className="document-section tutorial-section" key={item.id} aria-labelledby={item.id}>
      <div className="tutorial-heading"><h2 id={item.id} tabIndex={-1}>Lecture {item.number}: {item.title}</h2>{item.lesson && <ResourceLink href={item.lesson}>Ed lesson</ResourceLink>}</div>
      <div className="course-prose tutorial-prose"><CourseMarkdown>{item.body}</CourseMarkdown></div>
    </section>) : <EmptySearch query={query} onClear={() => setQuery('')} noun="tutorials" />}</div></div>
  </div>;
}

function EmptySearch({ query, onClear, noun }) {
  return <div className="page-empty"><h2>No {noun} found.</h2><p>No results for “{query}”.</p><button type="button" className="button secondary" onClick={onClear}>Clear search</button></div>;
}

function FAQsPage({ openGuide }) {
  const [query, setQuery] = useState('');
  const matches = faqs.filter(item => (item.title + ' ' + item.body).toLowerCase().includes(query.trim().toLowerCase()));
  return <div className="container page-content faq-page">
    <PageIntro title="FAQs.">The details that help you plan.</PageIntro>
    <div className="faq-layout"><aside className="faq-aside"><SearchBox value={query} onChange={setQuery} label="Search questions" placeholder="Search questions…" /><p className="faq-result-count" role="status">{matches.length} {matches.length === 1 ? 'question' : 'questions'}</p><div className="faq-help"><p>Still have a question?</p>{openGuide ? <button type="button" className="text-link" onClick={() => openGuide()}>Ask AC215<MessageCircle aria-hidden="true" /></button> : null}<a className="text-link" href="mailto:ac215harvard@gmail.com">Contact staff<ArrowUpRight aria-hidden="true" /></a></div></aside>
      <div className="faq-list">{matches.length ? matches.map(item => <details className="faq-item" key={item.id} id={item.id}><summary><span className="faq-number" aria-hidden="true">{String(item.number).padStart(2, '0')}</span><h2>{item.title}</h2><ChevronDown aria-hidden="true" /></summary><div className="faq-answer course-prose"><CourseMarkdown>{item.body}</CourseMarkdown></div></details>) : <EmptySearch query={query} onClear={() => setQuery('')} noun="questions" />}</div>
    </div>
  </div>;
}

function ReadingsPage() {
  return <div className="container page-content readings-page">
    <PageIntro title="Supplementary readings.">Additional material for independent learning.</PageIntro>
    <div className="document-layout"><PageIndex items={readings} /><div className="document-sections">{readings.map(item => <section className="document-section" key={item.id} aria-labelledby={item.id}><h2 id={item.id} tabIndex={-1}>{item.title}</h2><div className="course-prose"><CourseMarkdown>{item.body}</CourseMarkdown></div></section>)}</div></div>
  </div>;
}

function ShowcasePage() {
  return (
    <div className="container page-content showcase-page">
      <div className="showcase-copy">
        <h1>Project<br />showcase.</h1>
        <p>Coming soon.</p>
        <a className="text-link" href={siteUrl('/#timeline')}>Explore the milestones<ArrowUpRight aria-hidden="true" /></a>
      </div>
      <div className="showcase-scene">
        <svg className="showcase-filter" width="0" height="0" aria-hidden="true">
          <filter id="showcase-feather" colorInterpolationFilters="sRGB">
            <feGaussianBlur in="SourceAlpha" stdDeviation="7" result="softOutline" />
            <feComposite in="SourceGraphic" in2="softOutline" operator="in" />
          </filter>
        </svg>
        <img
          src={siteUrl('/showcase-poster-session.webp')}
          width="1402"
          height="1122"
          alt="Illustration of students presenting projects on laptop-connected displays to small groups of visitors in an atrium."
        />
      </div>
    </div>
  );
}

export default function CoursePages({ page, openGuide }) {
  if (page.id === 'readings') return <ReadingsPage />;
  if (page.id === 'schedule') return <SchedulePage />;
  if (page.id === 'policy') return <PolicyPage />;
  if (page.id === 'tutorials') return <TutorialsPage />;
  if (page.id === 'faqs') return <FAQsPage openGuide={openGuide} />;
  return <ShowcasePage />;
}
