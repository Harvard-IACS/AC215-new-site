import { sitePath } from './site-url';

export const homePage = {
  id: 'home', path: '/', label: 'Home', title: 'AC215 | Production AI Systems at Harvard',
  description: 'Harvard AC215: MLOps and LLMOps, the course milestones, teaching team, and building production AI systems.',
};

export const pages = [
  { id: 'schedule', aliases: ['/schedule/'], path: '/schedule.html', label: 'Schedule', title: 'Schedule | AC215', description: 'The AC215 semester schedule: lectures, quizzes, and project milestones.' },
  { id: 'milestones', aliases: ['/milestones/'], path: '/milestones.html', label: 'Milestones', title: 'Milestones | AC215', description: 'Deadlines and instructions for all five AC215 project milestones.' },
  { id: 'policy', aliases: ['/policy/'], path: '/policy.html', label: 'Policy', title: 'Course policy | AC215', description: 'AC215 grading, deadlines, collaboration, academic honesty, accessibility, and course policies.' },
  { id: 'tutorials', aliases: ['/tutorials_demo/'], path: '/tutorials.html', label: 'Tutorials', title: 'Tutorials | AC215', description: 'AC215 tutorials and demos, organized by lecture, with notebooks, repositories, and Ed lessons.' },
  { id: 'faqs', aliases: ['/faq/'], path: '/faqs.html', label: 'FAQs', title: 'FAQs | AC215', description: 'Answers to AC215 questions about lectures, quizzes, projects, teams, and course requirements.' },
  { id: 'showcase', aliases: ['/ProjectShowcase/'], path: '/showcase.html', label: 'Project showcase', title: 'Project showcase | AC215', description: 'The AC215 project showcase. Coming soon.' },
];

export const resourcePages = [
  { id: 'readings', path: '/readings.html', aliases: ['/readings/'], title: 'Supplementary readings | AC215', description: 'AC215 supplementary readings on virtual environments, containers and virtual machines.' },
  ...Array.from({ length: 5 }, (_, index) => ({ id: 'milestone-' + (index + 1), kind: 'milestone', index, path: '/milestone' + (index + 1) + '.html', aliases: ['/milestone' + (index + 1) + '/'], title: 'Milestone ' + (index + 1) + ' | AC215', description: 'Complete AC215 Milestone ' + (index + 1) + ' instructions, deliverables and evaluation requirements.' })),
];

export function pageForPath(pathname) {
  const path = sitePath(pathname).replace(/\/index\.html$/, '/');
  return [...pages, ...resourcePages].find(page => page.path === path || page.aliases?.includes(path)) || homePage;
}

// Original course navigation that now opens a section on Home.
export const legacyRedirects = [
  { path: '/staff/', target: '/#people' },
  { path: '/projects/', target: '/milestones.html' },
  { path: '/calendar/', target: '/schedule.html' },
];
