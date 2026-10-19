import {withOccurrenceIds} from './training.ts';
import type {CareProgram} from './care.ts';

/** Detached editor data: edits cannot mutate the displayed or persisted source. */
export function revisionDraft(program:CareProgram){
 return {revisionOf:program.id,title:program.title,items:withOccurrenceIds(program.items).map(item=>({...item,...(item.tempo?{tempo:{...item.tempo}}:{}),...(item.approvedSubstitutions?{approvedSubstitutions:[...item.approvedSubstitutions]}:{})}))};
}
