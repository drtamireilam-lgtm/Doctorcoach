'use client';
import {useId,useState,type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
export function ExerciseDisclosure({title,number,children,className='',anchorId}:{title:string;number?:number;children:ReactNode;className?:string;anchorId?:string}){
 const [open,setOpen]=useState(false),id=useId();
 return <section id={anchorId} tabIndex={anchorId?-1:undefined} aria-label={anchorId?title:undefined} className={`exercise-disclosure ${className}`}><h3 className="exercise-disclosure-heading"><button type="button" className="exercise-disclosure-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(!open)}>{number!=null&&<span className="row-number" aria-hidden="true">{String(number).padStart(2,'0')}</span>}<span>{title}</span><ChevronDown size={20} className={open?'expanded':''} aria-hidden="true"/></button></h3><div id={id} className="exercise-disclosure-body" hidden={!open}>{children}</div></section>;
}
