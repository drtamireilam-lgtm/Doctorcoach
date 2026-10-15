'use client';
import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import type {PlanItem} from '../lib/training';
import {repetitionLabel,unitLabels} from '../lib/training';
import {effortTarget} from '../lib/effort';
import {Localize} from './language-provider';

export function ProgramExerciseEditor({item,title,children}:{item:PlanItem;title:string;children:ReactNode}){
 return <Localize><details className="program-exercise-editor" onInvalidCapture={event=>{event.currentTarget.open=true;}}>
  <summary><span className="program-exercise-heading"><strong>{title}</strong><span>{item.sets} סטים × {repetitionLabel(item)} {unitLabels[item.unit]} · {effortTarget(item)} · {item.weightUnspecified?'לא הוגדר משקל':`${item.weight} ק״ג`}</span></span><ChevronDown size={20} aria-hidden="true"/></summary>
  <div className="program-exercise-fields">{children}</div>
 </details></Localize>;
}
