export const VIDEO_LIMIT=25*1024*1024;
type FileInfo={name:string;type:string;size:number};
export function videoFileProblem(file:FileInfo):string{
 const extension=file.name.split('.').pop()?.toLowerCase();
 if(!['mp4','webm'].includes(extension??'')||file.type!==(extension==='mp4'?'video/mp4':'video/webm'))return 'בחרו קובץ MP4 או WebM עם סוג קובץ תואם.';
 if(file.size<32||file.size>VIDEO_LIMIT)return 'גודל הקובץ חייב להיות בין 32 בתים ל־25 MB.';
 return '';
}
export function exerciseIdFromFilename(name:string,ids:Set<string>):string{
 const match=/^([a-z0-9-]+)(?:-demo)?\.(mp4|webm)$/i.exec(name);
 if(!match)return '';
 const stem=name.replace(/\.(mp4|webm)$/i,'').toLowerCase();
 return ids.has(stem)?stem:stem.endsWith('-demo')&&ids.has(stem.slice(0,-5))?stem.slice(0,-5):'';
}
export function duplicateExerciseIds(rows:{exerciseId:string}[]):Set<string>{
 const seen=new Set<string>(),duplicates=new Set<string>();
 for(const row of rows){if(!row.exerciseId)continue;if(seen.has(row.exerciseId))duplicates.add(row.exerciseId);seen.add(row.exerciseId);}return duplicates;
}
export async function runVideoQueue<T>(items:T[],upload:(item:T)=>Promise<void>,concurrency=2){
 let next=0;const errors:unknown[]=[];
 await Promise.all(Array.from({length:Math.min(items.length,Math.max(1,concurrency))},async()=>{while(next<items.length){const item=items[next++];try{await upload(item);}catch(error){errors.push(error);}}}));
 return errors;
}
