type LibraryExercise={id:string;name:string;en:string;area:string;group:string;kind:string;level:string};
type Demo={exerciseId:string;kind:string;status:string;published:boolean};
export function demoExerciseIds(videos:Demo[]|null):Set<string>|null{
 return videos===null?null:new Set(videos.filter(v=>v.kind==='demo'&&v.status==='ready'&&v.published).map(v=>v.exerciseId));
}
export function filterLibraryExercises<T extends LibraryExercise>(items:T[],filters:{search:string;area:string;kind:string;level:string;favoritesOnly:boolean;favorites:string[];videosOnly:boolean;demoIds:Set<string>|null}):T[]{
 const query=filters.search.trim().toLowerCase();
 return items.filter(e=>(!filters.favoritesOnly||filters.favorites.includes(e.id))&&
  (!filters.videosOnly||!!filters.demoIds?.has(e.id))&&
  (filters.area==='all'||e.group===filters.area)&&(filters.kind==='all'||e.kind===filters.kind)&&
  (filters.level==='all'||e.level===filters.level)&&`${e.name} ${e.en} ${e.area} ${e.group}`.toLowerCase().includes(query));
}
