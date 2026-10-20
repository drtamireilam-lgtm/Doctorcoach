'use client';
import {Localize} from "../components/language-provider";
import {useEffect,useRef,useState} from 'react';
import {navigationTourSteps} from '../lib/navigation-tour';

type Props={simpleTrainee:boolean;activeWorkout:boolean;go:(section:string)=>void;done:(completed:boolean)=>void};
export function NavigationTour(props:Props){
 // Choose the guide once per launch; a viewport change must not jump steps.
 const [simpleMobile,setSimpleMobile]=useState<boolean|null>(null);
 useEffect(()=>{setSimpleMobile(props.simpleTrainee&&window.matchMedia('(max-width:760px)').matches);},[]);
 return simpleMobile===null?null:<Localize>{<Tour {...props} simpleMobile={simpleMobile}/>}</Localize>;
}
function Tour({simpleMobile,activeWorkout,go,done}:Props&{simpleMobile:boolean}){
 const [steps]=useState(()=>navigationTourSteps(simpleMobile,activeWorkout));
 const [index,setIndex]=useState(0);
 const heading=useRef<HTMLHeadingElement>(null);
 const callbacks=useRef({go,done});callbacks.current={go,done};
 const step=steps[index];
 useEffect(()=>{
  callbacks.current.go(step.section);
  heading.current?.focus({preventScroll:true});
  let target:Element|null=null;
  const timer=window.setTimeout(()=>{
   if(!step.target)return;
   target=document.querySelector(`[data-tour="${step.target}"]`);
   target?.classList.add('tour-highlight');
   if(!simpleMobile)target?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  },250);
  return()=>{window.clearTimeout(timer);target?.classList.remove('tour-highlight');};
 },[step,simpleMobile]);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();callbacks.current.done(false);}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[]);
 return <Localize>{<aside className="navigation-tour" dir="rtl" aria-labelledby="navigation-tour-title">
  <span className="eyebrow">סיור באפליקציה · {index+1}/{steps.length}</span>
  <h2 id="navigation-tour-title" ref={heading} tabIndex={-1}>{step.title}</h2><p>{step.text}</p>
  <div className="care-actions"><button className="button primary" onClick={()=>index===steps.length-1?done(true):setIndex(i=>i+1)}>{index===steps.length-1?'סיום הסיור':'הבא'}</button>{index>0&&<button className="text-button" onClick={()=>setIndex(i=>i-1)}>הקודם</button>}<button className="text-button" onClick={()=>done(false)}>סגירת הסיור</button></div>
 </aside>}</Localize>;
}
