import type {StaffActivity} from './staff-activity.ts';
export type ClientAttentionFilter='all'|'new'|'noProgram'|'notStarted'|'unread'|'archived';
export type ClientAttention={createdAt?:string;state?:string;unread?:number;activity?:Pick<StaffActivity,'programTitle'|'programStarted'>|null};
export function recentClient(at:string|undefined,now=new Date()){const time=Date.parse(at??'');return Number.isFinite(time)&&time<=now.getTime()&&time>=now.getTime()-7*86400000;}
export function matchesClientAttention(c:ClientAttention,filter:ClientAttentionFilter,now=new Date()){
 if(filter==='all')return true;if(filter==='archived')return c.state==='archived';if(c.state==='archived')return false;
 if(filter==='new')return recentClient(c.createdAt,now);if(filter==='unread')return (c.unread??0)>0;
 if(!c.activity)return false;return filter==='noProgram'?!c.activity.programTitle:c.activity.programStarted===false;
}
