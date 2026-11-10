import { siteUrl } from './site-url';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MilestoneMarkdown({ children }) {
  return <Markdown remarkPlugins={[remarkGfm]} components={{
    a: ({href,children}) => <a href={siteUrl(href)} target="_blank" rel="noreferrer">{children}</a>,
    img: ({ src, alt }) => <img src={siteUrl(src)} alt={alt} />,
    table: ({children}) => <div className="milestone-table-wrap"><table>{children}</table></div>,
  }}>{children}</Markdown>;
}
