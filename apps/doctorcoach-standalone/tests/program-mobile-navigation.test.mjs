import test from 'node:test';
import assert from 'node:assert/strict';
import {revealProgramPicker,revealProgramExercise} from '../lib/program-editor-navigation.ts';
import {programDraftStatusMessage} from '../lib/program-draft-status.ts';
test('program shortcuts stay in their initiating form and target the exact occurrence',()=>{
 const calls=[],first={dataset:{editorOccurrence:'duplicate:1'},open:false,focus:()=>calls.push('first'),scrollIntoView:()=>{}},second={dataset:{editorOccurrence:'duplicate:2'},open:false,focus:()=>calls.push('second'),scrollIntoView:()=>calls.push('scroll')};
 const form={querySelectorAll:()=>[first,second]};assert.equal(revealProgramExercise(form,'duplicate:2'),true);assert.equal(first.open,false);assert.equal(second.open,true);assert.deepEqual(calls,['second','scroll']);assert.equal(revealProgramExercise(form,'missing'),false);assert.equal(revealProgramExercise(null,'duplicate:2'),false);
});
test('add shortcut opens the local picker and focuses search',()=>{
 const calls=[],picker={open:false,querySelector:()=>({focus:()=>calls.push('focus')}),scrollIntoView:()=>{assert.equal(picker.open,true);calls.push('scroll')}};assert.equal(revealProgramPicker({querySelector:()=>picker}),true);assert.deepEqual(calls,['focus','scroll']);assert.equal(revealProgramPicker(null),false);
});
test('pending fields, conflicts and failures cannot be presented as a saved draft',()=>{
 const saved={ready:true,saving:false,blocked:'',dirty:false,updatedAt:'2026-11-17T12:00:00Z',pendingFields:false,error:''};assert.match(programDraftStatusMessage(saved,true),/saved to your account/);assert.match(programDraftStatusMessage({...saved,pendingFields:true},true),/still being edited/);assert.match(programDraftStatusMessage({...saved,blocked:'conflict'},true),/Load the latest/);assert.match(programDraftStatusMessage({...saved,error:'offline'},true),/Saving failed/);assert.match(programDraftStatusMessage({...saved,ready:false},true),/not loaded/);assert.match(programDraftStatusMessage({...saved,pendingFields:true},false),/שטרם אושר/);
});
