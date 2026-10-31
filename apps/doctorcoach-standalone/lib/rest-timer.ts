export function remainingSeconds(deadline:number,now:number){return Math.max(0,Math.ceil((deadline-now)/1000));}
export function formatCountdown(seconds:number){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
export type TimerState={duration:number;remaining:number;deadline:number|null};
export const defaultTimerState:TimerState={duration:90,remaining:90,deadline:null};
export function restoreTimerState(raw:string|null):TimerState{
 try{const s=JSON.parse(raw??'null');if(s&&[30,60,90,120,180,300].includes(s.duration)&&Number.isInteger(s.remaining)&&s.remaining>=0&&s.remaining<=s.duration&&(s.deadline===null||Number.isFinite(s.deadline)&&s.deadline>0))return {duration:s.duration,remaining:s.remaining,deadline:s.deadline};}catch{}
 return defaultTimerState;
}
export function timerTransition(s:TimerState,action:'start'|'pause'|'reset',now:number):TimerState{
 if(action==='reset')return {...s,remaining:s.duration,deadline:null};
 if(action==='pause')return {...s,remaining:s.deadline===null?s.remaining:remainingSeconds(s.deadline,now),deadline:null};
 return s.remaining>0?{...s,deadline:now+s.remaining*1000}:s;
}
