/** Only the initiating program form is searched; another client's editor is never targeted. */
export function revealProgramPicker(form:HTMLFormElement|null){
 const picker=form?.querySelector<HTMLDetailsElement>('.coach-exercise-picker');if(!picker)return false;
 picker.open=true;const input=picker.querySelector<HTMLInputElement>('input[type="search"]');input?.focus({preventScroll:true});picker.scrollIntoView({behavior:'auto',block:'start'});return true;
}
export function revealProgramExercise(form:HTMLFormElement|null,key:string){
 const target=Array.from(form?.querySelectorAll<HTMLDetailsElement>('[data-editor-occurrence]')??[]).find(node=>node.dataset.editorOccurrence===key);if(!target)return false;
 target.open=true;target.focus({preventScroll:true});target.scrollIntoView({behavior:'auto',block:'start'});return true;
}
