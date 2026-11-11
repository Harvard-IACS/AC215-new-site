import { MilestoneDetail } from './milestone-detail';
import { milestones } from './data/course';

export default function MilestonesPage() {
  return <div className="container page-content">
    <header className="page-intro"><div>
      <h1>Milestones.</h1>
      <p>Project deadlines and instructions. All milestones are due at 10 pm Eastern.</p>
    </div></header>
    <ol className="milestone-list">{milestones.map((item, index) => <li key={item.id}>
      <MilestoneDetail item={item} index={index} />
    </li>)}</ol>
  </div>;
}
