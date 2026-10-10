import type {CareProgram} from './care.ts';

/** Detached editor data: edits cannot mutate the displayed or persisted source. */
export function revisionDraft(program:CareProgram){
 return {revisionOf:program.id,title:program.title,items:program.items.map(item=>({...item,...(item.approvedSubstitutions?{approvedSubstitutions:[...item.approvedSubstitutions]}:{})}))};
}
