export const learningTopics=['shoulder','knee','spine','rpe','doctorcoach'] as const;
export type LearningTopic=typeof learningTopics[number];
export function learningTopic(hash:string):LearningTopic|null{
 const [section,query='']=hash.replace(/^#/,'').split('?');
 if(section!=='learn')return null;
 const article=new URLSearchParams(query).get('article');
 return learningTopics.includes(article as LearningTopic)?article as LearningTopic:null;
}
export function learningArticleHref(topic:LearningTopic){return '#learn?article='+topic;}
