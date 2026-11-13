// Synthetic React event flow; DOM emulation does not validate rendered layout.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {JSDOM}=await import(process.env.DC_JSDOM_MODULE??'jsdom');
const {build}=await import(process.env.DC_ESBUILD_MODULE??'esbuild');
const root=fileURLToPath(new URL('../',import.meta.url)),fixture=root+'/.sites-runtime/program-substitution-dom';
await mkdir(fixture,{recursive:true});
await writeFile(fixture+'/entry.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import {LanguageProvider} from '../../components/language-provider';import {ProgramExerciseSubstitution} from '../../components/program-exercise-substitution';import {defaultPrescription} from '../../lib/training';import {exercises} from '../../lib/content';export {act} from 'react';export const mount=(node,onChange)=>{const root=createRoot(node);root.render(<LanguageProvider><ProgramExerciseSubstitution item={{...defaultPrescription('goblet'),occurrenceId:'slot',weight:60,targetRpe:7}} catalog={exercises} onChange={onChange}/></LanguageProvider>);return root;};`);
await build({entryPoints:[fixture+'/entry.tsx'],outfile:fixture+'/bundle.mjs',bundle:true,format:'esm',platform:'node',jsx:'automatic',external:['react','react-dom/client','react/jsx-runtime']});
const language=process.env.DC_LANGUAGE??'en',dom=new JSDOM('<html><body><div id="root"></div></body></html>',{url:'http://localhost/?lang='+language,pretendToBeVisual:true});
for(const key of ['window','document','location','history','HTMLElement','HTMLInputElement','HTMLSelectElement','MutationObserver','Event','MouseEvent','CustomEvent','localStorage'])globalThis[key]=dom.window[key];
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const {mount,act}=await import(pathToFileURL(fixture+'/bundle.mjs'));let render;const changes=[];
try{
 await act(async()=>{render=mount(document.getElementById('root'),patch=>changes.push(patch));});
 const en=language==='en',label=en?'Replacement exercise':'תרגיל חלופי',apply=en?'Apply exercise replacement':'החלת החלפת התרגיל';
 const select=[...document.querySelectorAll('label')].find(e=>e.textContent.startsWith(label)).querySelector('select');
 assert.ok(select);assert.ok(![...select.options].some(e=>e.value==='walk'));assert.ok(![...select.options].some(e=>e.value==='goblet'));
 const button=[...document.querySelectorAll('button')].find(e=>e.textContent===apply);assert.equal(button.disabled,true);
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(select,'bench');select.dispatchEvent(new Event('change',{bubbles:true}));});
 assert.equal(changes.length,0,'Selection alone must not mutate the draft');assert.equal(button.disabled,false);
 await act(async()=>button.click());assert.equal(changes.length,1);const patch=changes[0];
 assert.equal(patch.exerciseId,'bench');assert.equal(patch.occurrenceId,'slot');assert.equal(patch.weight,0);assert.equal(patch.weightUnspecified,true);assert.equal(patch.targetRpe,7);assert.equal(select.value,'');assert.equal(button.disabled,true);
 console.log('PASS: '+language+' real React substitution selection requires explicit Apply, incompatible/current choices excluded, identity/effort retained and starting load cleared. DOM emulation only.');
}finally{await act(async()=>render?.unmount());dom.window.close();}
