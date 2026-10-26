/** Resolve only canonical library IDs; hash data never changes permissions or programs. */
export function readExerciseSelection(hash:string,ids:ReadonlySet<string>):string|null{
 const [section,query]=hash.replace(/^#/,'').split('?');
 if(section!=='library')return null;
 const id=new URLSearchParams(query??'').get('exercise');
 return id&&ids.has(id)?id:null;
}
