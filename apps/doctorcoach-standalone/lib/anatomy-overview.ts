export type AnatomyOverview='body'|'skeleton'|'musculoskeletal';
/** Keep explicit old modes; use bones and muscles for a fresh overview. */
export function anatomyOverviewFromHash(hash:string,fallback:AnatomyOverview='body'):AnatomyOverview{
 const query=new URLSearchParams(hash.split('?')[1]??'');
 const mode=query.get('atlas');if(mode==='body'||mode==='skeleton'||mode==='musculoskeletal')return mode;
 return query.has('region')||query.has('muscle')?fallback:'musculoskeletal';
}
