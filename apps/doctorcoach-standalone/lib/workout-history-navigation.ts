export const workoutHistoryAnchor=(sessionId:string)=>'workout-history-'+encodeURIComponent(sessionId);
/** Called after the history view mounts. No URL, data or preference mutation. */
export function revealWorkoutHistory(sessionId:string,doc:Pick<Document,'getElementById'>=document){
 const target=doc.getElementById(workoutHistoryAnchor(sessionId));if(!target)return false;
 let node:HTMLElement|null=target;
 while(node){if(node.tagName==='DETAILS')(node as HTMLDetailsElement).open=true;node=node.parentElement;}
 target.focus({preventScroll:true});target.scrollIntoView({block:'start',behavior:'auto'});return true;
}
