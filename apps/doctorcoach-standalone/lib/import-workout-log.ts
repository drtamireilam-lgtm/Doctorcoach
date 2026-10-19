export type SourceSet={weight:number;reps:number;count:number};
/** Strictly parse known log syntax; comments, substitutions and incomplete sets require review. */
export function parseSourceSets(value:string):{sets:SourceSet[];error:string|null}{
 if(!value.trim())return {sets:[],error:null};
 const source=value.replace(/[×*]/g,'x').replace(/\s+/g,'').toLowerCase();
 const parts=source.split(',');const sets:SourceSet[]=[];
 for(const part of parts){
  const plain=/^(\d+(?:\.\d+)?)x(\d+)$/.exec(part);
  const repeated=/^\((\d+(?:\.\d+)?)x(\d+)\)x?(\d+)$/.exec(part);
  const prefix=/^(\d+)\((\d+(?:\.\d+)?)x(\d+)\)$/.exec(part);
  if(!plain&&!repeated&&!prefix)return {sets:[],error:'הדיווח כולל טקסט או סימון שאינו חד־משמעי. בדקו את המקור ובחרו משקל ידנית.'};
  const weight=Number(prefix?prefix[2]:(plain??repeated)![1]),reps=Number(prefix?prefix[3]:(plain??repeated)![2]),count=Number(prefix?prefix[1]:repeated?repeated[3]:1);
  if(!Number.isFinite(weight)||weight<0||weight>1000||reps<1||reps>100||count<1||count>20)return {sets:[],error:'ערכי הסט במקור אינם בטווח המותר.'};
  sets.push({weight,reps,count});
 }
 if(sets.reduce((n,s)=>n+s.count,0)>20)return {sets:[],error:'דיווח המקור כולל יותר מ־20 סטים.'};
 return {sets,error:null};
}
