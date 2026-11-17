'use client';
import {programScopedId} from '../lib/import-source';
import {UnlinkedImportDemoNotice} from './unlinked-import-demo-notice';
import {Localize} from "../components/language-provider";
import {useState} from 'react';
import {VideoWorkspace} from './video-workspace';
export function WorkoutDemo({exerciseId,readOnly=false}:{exerciseId:string;readOnly?:boolean}){
 const [open,setOpen]=useState(false);
 if(programScopedId(exerciseId))return <UnlinkedImportDemoNotice/>;
 return <Localize>{<details className="workout-demo" onToggle={e=>setOpen(e.currentTarget.open)}><summary>צפייה בסרטון הדגמה של התרגיל</summary>{open&&<VideoWorkspace kind="demo" exerciseId={exerciseId} readOnly={readOnly}/>}</details>}</Localize>;
}
