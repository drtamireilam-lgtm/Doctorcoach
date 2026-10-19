type Video={exerciseId:string;caption:string;published:boolean};
export function filterManagedVideos<T extends Video>(videos:T[],state:string,query:string,names:Map<string,string>):T[]{
 const search=query.trim().toLowerCase();
 return videos.filter(v=>(state==='all'||(state==='published'?v.published:!v.published))&&`${names.get(v.exerciseId)??v.exerciseId} ${v.caption}`.toLowerCase().includes(search));
}
