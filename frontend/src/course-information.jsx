import { siteUrl } from './site-url';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import overview from './data/course-pages/overview.md?raw';
import SectionNav, { useActiveSection } from './section-nav';

const sectionIndex = Array.from(overview.matchAll(/^## (.+)$/gm), ([, title]) => ({ id: headingId(title), title }));

function headingId(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
}

export default function CourseInformation() {
  const activeSection = useActiveSection(sectionIndex);
  return <section className="course-information container" aria-labelledby="course-information">
    <div className="section-intro">
      <h2 id="course-information">Course information.</h2>
      <p>Preparation, learning goals, and how the course works.</p>
    </div>
    <div className="document-layout">
      <SectionNav className="page-index" label="Course information sections" activeSection={activeSection}>
        <p>On this page</p>
        {sectionIndex.map(({ id, title }) => <a key={id} href={'#' + id} aria-current={id === activeSection ? 'location' : undefined}>{title}</a>)}
      </SectionNav>
      <div className="course-prose course-information-prose">
        <Markdown remarkPlugins={[remarkGfm]} components={{
          h2: ({ children }) => <h3 id={headingId(children)} tabIndex={-1}>{children}</h3>,
          h3: ({ children }) => <h4 id={headingId(children)} tabIndex={-1}>{children}</h4>,
          a: ({ href, children }) => <a href={siteUrl(href)} {...(/^https?:/.test(href || '') ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a>,
        }}>{overview}</Markdown>
      </div>
    </div>
  </section>;
}
