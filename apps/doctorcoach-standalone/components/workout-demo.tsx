'use client';
import {Localize} from "../components/language-provider";
import {useState} from 'react';
import {VideoWorkspace} from './video-workspace';
export function WorkoutDemo({exerciseId}:{exerciseId:string}){
 const [open,setOpen]=useState(false);
 return <Localize>{<details className="workout-demo" onToggle={e=>setOpen(e.currentTarget.open)}><summary>צפייה בסרטון הדגמה של התרגיל</summary>{open&&<VideoWorkspace kind="demo" exerciseId={exerciseId}/>}</details>}</Localize>;
}
