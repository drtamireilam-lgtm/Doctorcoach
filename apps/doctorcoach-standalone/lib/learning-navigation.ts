export const learningTopics=['shoulder','knee','spine','rpe','doctorcoach','atp','contraction','adaptation','recovery','creatine','caffeine','protein'] as const;
export type LearningTopic=typeof learningTopics[number];
export type LearningSection='anatomy'|'physiology'|'supplements';
export function learningSection(hash:string):LearningSection{
 const topic=learningTopic(hash);
 if(topic&&['atp','contraction','adaptation','recovery'].includes(topic))return 'physiology';
 if(topic&&['creatine','caffeine','protein'].includes(topic))return 'supplements';
 if(topic)return 'anatomy';
 const [section,query='']=hash.replace(/^#/,'').split('?');
 const selected=new URLSearchParams(query).get('section');
 return section==='learn'&&(selected==='physiology'||selected==='supplements')?selected:'anatomy';
}
export function learningTopic(hash:string):LearningTopic|null{
 const [section,query='']=hash.replace(/^#/,'').split('?');
 if(section!=='learn')return null;
 const article=new URLSearchParams(query).get('article');
 return learningTopics.includes(article as LearningTopic)?article as LearningTopic:null;
}
export function learningArticleHref(topic:LearningTopic){return '#learn?article='+topic;}
