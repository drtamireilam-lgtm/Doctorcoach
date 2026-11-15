'use client';
import {useId,type ReactNode} from 'react';
import {useLanguage} from './language-provider';
const mime='application/x-doctorcoach-occurrence';
export function ProgramOrderTarget({occurrenceKey,children,onDropBefore}:{occurrenceKey:string;children:ReactNode;onDropBefore:(source:string,target:string)=>void}){
 const en=useLanguage().language==='en',hint=useId();
 return <div className="program-order-target" onDragOver={e=>{if(Array.from(e.dataTransfer.types).includes(mime)){e.preventDefault();e.dataTransfer.dropEffect='move';}}} onDrop={e=>{const source=e.dataTransfer.getData(mime);if(source){e.preventDefault();onDropBefore(source,occurrenceKey);}}}>
 <button type="button" className="text-button program-drag-handle" draggable aria-describedby={hint} onDragStart={e=>{e.dataTransfer.setData(mime,occurrenceKey);e.dataTransfer.effectAllowed='move';}}>{en?'⠿ Drag to reorder':'⠿ גרירה לשינוי סדר'}</button><span id={hint} className="field-hint">{en?'Drop before an exercise in this section. On touch or keyboard use the move buttons.':'גררו לפני תרגיל באותו חלק. במגע או במקלדת השתמשו בכפתורי ההעברה.'}</span>{children}</div>;
}
