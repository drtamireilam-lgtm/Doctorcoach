export function remainingSeconds(deadline:number,now:number){return Math.max(0,Math.ceil((deadline-now)/1000));}
export function formatCountdown(seconds:number){return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
