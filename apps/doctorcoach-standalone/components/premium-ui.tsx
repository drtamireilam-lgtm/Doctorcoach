import type {ReactNode} from 'react';

export function PremiumCard({children,className=''}:{children:ReactNode;className?:string}){
 return <section className={`dc-premium-card ${className}`}>{children}</section>;
}
/** Unknown measurements get an unfilled ring, never a fabricated score. */
export function ProgressRing({value,label,detail,progress=null}:{value:string;label:string;detail?:string;progress?:number|null}){
 const known=progress!==null&&Number.isFinite(progress);
 return <div className="dc-progress-metric"><div className="dc-progress-ring"><svg viewBox="0 0 100 100" aria-hidden="true"><circle className="dc-ring-track" cx="50" cy="50" r="43"/><circle visibility={known?'visible':'hidden'} className="dc-ring-fill" cx="50" cy="50" r="43" pathLength="100" strokeDasharray={`${known?Math.max(0,Math.min(100,progress)):0} 100`}/></svg><div><strong dir="auto">{value}</strong><span>{label}</span></div></div>{detail&&<small>{detail}</small>}</div>;
}
