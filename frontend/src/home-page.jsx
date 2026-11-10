import { siteUrl } from './site-url';
import { useRef } from 'react';
import { ArrowDownRight, ExternalLink, MessageCircle } from 'lucide-react';
import { SECScene } from './sec-scene';
import { MilestoneDetail } from './milestone-detail';
import CourseInformation from './course-information';
import { DISCUSSION_URL, LECTURES_URL, instructors, milestones, questions, staff } from './data/course';

function Person({ person, instructor = false }) {
  return <article className={instructor ? 'person person-lead' : 'person'}>
    <img src={siteUrl(person.image)} width="400" height="480" loading="lazy" alt="" />
    <a className="person-name" href={person.url} target="_blank" rel="noreferrer">{person.name}</a>
    {instructor ? <span className="person-role">{person.role}</span> : null}
    {person.website ? <a className="person-role" href={person.website.url} target="_blank" rel="noreferrer">{person.website.label}</a> : null}
  </article>;
}

export default function HomePage({ openGuide }) {
  const trackRef = useRef(null);
  return <>
      <div className="experience container" ref={trackRef}>
        <div className="chapter-column">
          <section className="hero" aria-labelledby="hero-title">
            <div className="intro-copy">
              <h1 id="hero-title">AC215.<br />AI in production.</h1>
              <p className="lead">Build, deploy, and operate complete AI systems.</p>
              <p className="enrollment-notice">Enrollment is closed - the class has reached capacity.</p>
              <div className="hero-actions">
                <a className="button primary" href="#curriculum">Explore the course <ArrowDownRight aria-hidden="true" /></a>
                {openGuide ? <button className="button secondary" type="button" onClick={() => openGuide()}>Ask AC215 <MessageCircle aria-hidden="true" /></button> : null}
              </div>
              <a className="text-link" href="https://canvas.harvard.edu/courses/170012" target="_blank" rel="noreferrer">Watch Prof. Pavlos Protopapas’s introductory video <ExternalLink aria-hidden="true" /></a>
              <a className="text-link" href="#course-information">Prerequisites and course information <ArrowDownRight aria-hidden="true" /></a>
            </div>
            <p className="hero-course-name">MLOps &amp; LLMOps<br /><span className="muted">Production AI Systems</span></p>
          </section>
          <section className="course-chapter" aria-labelledby="curriculum">
            <h2 id="curriculum">The model is<br />the beginning.</h2>
            <p className="chapter-lead">An experiment becomes an application people can use.</p>
            <dl className="topic-list">
              <div><dt>Learn the models</dt><dd>LLMs, retrieval, fine-tuning, and evaluation.</dd></div>
              <div><dt>Build the infrastructure</dt><dd>Containers, networking, cloud, and data pipelines.</dd></div>
              <div><dt>Operate the system</dt><dd>APIs, interfaces, monitoring, and deployment.</dd></div>
            </dl>
            <a className="text-link" href={LECTURES_URL} target="_blank" rel="noreferrer">Open lecture content <ExternalLink aria-hidden="true" /></a>
          </section>
          <section className="course-chapter project-chapter" aria-labelledby="project-heading">
            <h2 id="project-heading">One team.<br />A complete system.</h2>
            <p className="chapter-lead">Build your own AI application from problem to production.</p>
            <p>Teams of 3 to 5 connect modeling, data, infrastructure, and a usable interface. Every member learns the whole system.</p>
            <a className="text-link" href="#timeline">See the project milestones <ArrowDownRight aria-hidden="true" /></a>
          </section>
          <section className="course-chapter classroom-chapter" aria-labelledby="classroom">
            <h2 id="classroom">Take your seat.</h2>
            <p className="chapter-lead">SEC 1.321.<br />Tuesday and Thursday, 12:45 to 2:45 pm.</p>
            <p>Extension students join by Zoom.</p>
            <div className="course-resources"><a className="text-link" href={LECTURES_URL} target="_blank" rel="noreferrer">Lectures on Ed <ExternalLink aria-hidden="true" /></a><a className="text-link" href={DISCUSSION_URL} target="_blank" rel="noreferrer">Class discussion <ExternalLink aria-hidden="true" /></a></div>
            <div className="classroom-still">
              <img className="classroom-still-light" src={siteUrl('/classroom-poster-light.png')} width="728" height="576" loading="lazy" alt="Inside SEC 1.321, with curved red, orange and gold seating facing three projection screens" />
              <img className="classroom-still-dark" src={siteUrl('/classroom-poster-dark.png')} width="728" height="576" loading="lazy" alt="" aria-hidden="true" />
            </div>
          </section>
        </div>
        <div className="scene-column"><div className="scene-sticky"><SECScene trackRef={trackRef} /></div></div>
      </div>
      <CourseInformation />
      <section className="timeline-section" aria-labelledby="timeline">
        <div className="container">
          <div className="section-intro"><h2 id="timeline">Five milestones.<br />One working system.</h2><p>Build with feedback from the teaching team.</p></div>
          <ol className="milestone-list">{milestones.map((item, index) => <li key={item.id}>
            <MilestoneDetail item={item} index={index} />
          </li>)}</ol>
          <p className="timeline-note">Due at 10 pm Eastern.</p>
        </div>
      </section>
      <section className="people-section container" aria-labelledby="people">
        <div className="section-intro"><h2 id="people">Learn with<br />Pavlos and Chris.</h2><a className="text-link" href={DISCUSSION_URL} target="_blank" rel="noreferrer">Connect with the teaching team <ExternalLink aria-hidden="true" /></a></div>
        <div className="people-layout"><div className="instructor-list">{instructors.map(person => <Person key={person.name} person={person} instructor />)}</div><div className="staff-list">{staff.map(person => <Person key={person.name} person={person} />)}</div></div>
      </section>
      {openGuide ? <section className="ask-section container" id="ask" aria-labelledby="ask-heading">
        <div><h2 id="ask-heading">Ask the course.</h2><p>Projects, lecture plans, and the details you need.</p><button className="button secondary" type="button" onClick={() => openGuide()}>Open the course guide <MessageCircle aria-hidden="true" /></button></div>
        <div className="question-list">{questions.map(question => <button type="button" key={question} onClick={() => openGuide(question)}>{question}<ArrowDownRight aria-hidden="true" /></button>)}</div>
      </section> : null}
  </>;
}
