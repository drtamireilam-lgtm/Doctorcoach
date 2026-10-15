export type RecoveryTab='rehab'|'return'|'readiness';
export type RecoveryTarget={tab:RecoveryTab;episodeId?:string;from:'care'|'plan'|'history'};
const episodePattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function recoveryTarget(hash:string):RecoveryTarget{
 const [section,query]=hash.replace(/^#/,'').split('?');
 if(section!=='recovery')return {tab:'rehab',from:'history'};
 const p=new URLSearchParams(query),tab=p.get('tab'),episodeId=p.get('episode')??'',from=p.get('from');
 return {tab:tab==='return'||tab==='readiness'?tab:'rehab',...(episodePattern.test(episodeId)?{episodeId}:{}),from:from==='care'||from==='plan'?from:'history'};
}
export function recoveryHref(target:RecoveryTarget){
 const p=new URLSearchParams({tab:target.tab,from:target.from});
 if(target.episodeId&&episodePattern.test(target.episodeId))p.set('episode',target.episodeId);
 return '#recovery?'+p.toString();
}
