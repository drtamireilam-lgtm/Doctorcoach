export type AnatomyOverview='body'|'skeleton';
/** Keep old surface deep links; use the skeleton for a fresh learning overview. */
export function anatomyOverviewFromHash(hash:string,fallback:AnatomyOverview='body'):AnatomyOverview{
 const query=new URLSearchParams(hash.split('?')[1]??'');
 const mode=query.get('atlas');if(mode==='body'||mode==='skeleton')return mode;
 return query.has('region')||query.has('muscle')?fallback:'skeleton';
}
