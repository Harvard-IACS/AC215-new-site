import ms1 from './milestones/ms1.md?raw';
import ms2 from './milestones/ms2.md?raw';
import ms3 from './milestones/ms3.md?raw';
import ms4 from './milestones/ms4.md?raw';
import ms5 from './milestones/ms5.md?raw';
export const milestoneInstructions = [{title:"Project Proposals & Team Formation",markdown:ms1},
{title:"MLOps Infrastructure",markdown:ms2},
{title:"Integration and Deployment",markdown:ms3},
{title:"Design & Development",markdown:ms4},
{title:"Deployment & Final Project Delivery",markdown:ms5}].map(item => ({...item,sections: [...item.markdown.matchAll(/^### (.+)\n([\s\S]*?)(?=^### |$(?![\s\S]))/gm)].map((match,index)=>({title:match[1],body:match[2].replace(/^---\s*$/gm,'').trim(),id:'section-'+index}))}));

