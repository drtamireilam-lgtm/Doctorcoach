// Keep a selectable interval of at least a quarter second, including short clips.
export function trimSelection(duration:number,start:number,end:number,edge:'start'|'end',value:number){
 if(!Number.isFinite(duration)||duration<.25||!Number.isFinite(value))throw new Error('Invalid video selection');
 const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
 const nextStart=edge==='start'?clamp(value,0,end-.25):start;
 const nextEnd=edge==='end'?clamp(value,start+.25,duration):end;
 return {start:nextStart,end:nextEnd,preview:edge==='start'?nextStart:Math.max(nextStart,nextEnd-.01)};
}
