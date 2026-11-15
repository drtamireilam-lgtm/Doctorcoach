import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const source=readFileSync(new URL('../components/program-excel-import.tsx',import.meta.url),'utf8');
function fixture(language,pdfError){
 const states=[],exports={};let cursor=0,reads=0;
 const modules={'react':{useState(initial){const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v;}];}},'react/jsx-runtime':jsx,'./language-provider':{useLanguage:()=>({language}),Localize:'Localize'},'../hooks/use-custom-exercises':{useCustomExercises:()=>({exercises:[]})},'../hooks/use-care':{useCareResource:()=>({data:{items:[]}}),useCareAction:()=>({})},'../lib/program-import':{duplicateImportRowNumbers:()=>[]},'../lib/pdf-program-reader':{readProgramPdf:async()=>{throw new Error(pdfError);}}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:k=>modules[k]??{},Uint8Array,crypto:globalThis.crypto});
 function render(){cursor=0;return exports.ProgramExcelImport({hasDraft:false,onAccept:()=>{throw new Error('must not save');}});}
 function find(node,predicate){if(!node||typeof node!=='object')return null;if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const match=find(child,predicate);if(match)return match;}return null;}
 return {async upload(name,size=1){const input={files:[{name,size,arrayBuffer:async()=>{reads++;return new ArrayBuffer(1);}}],value:name};await find(render(),n=>n.type==='input'&&n.props.type==='file').props.onChange({currentTarget:input});assert.equal(input.value,'');assert.equal(find(render(),n=>n.type==='input'&&n.props.type==='file').props.disabled,false);return find(render(),n=>n.props?.role==='alert')?.props.children;},get reads(){return reads;}};
}
for(const language of ['he','en'])for(const [name,size] of [['oversized.csv',5*1024*1024+1],['legacy.xls',1]])test(`invalid ${name} explains supported formats in ${language} without reading it`,async()=>{
 const f=fixture(language),message=await f.upload(name,size);assert.match(message,/XLSX, CSV/);assert.match(message,/PDF/);assert.match(message,/5MB/);assert.equal(/[א-ת]/.test(message),language==='he');assert.equal(f.reads,0);
});
for(const language of ['he','en'])test(`scanned PDF keeps actionable unsupported-format feedback in ${language}`,async()=>{
 const f=fixture(language,'לא נמצא טקסט שניתן לחלץ בעמוד 2. סריקות ותמונות אינן נתמכות; העלו PDF עם טקסט שניתן לסמן או הסירו עמודים ללא טקסט.'),message=await f.upload('scan.pdf');
 assert.match(message,language==='en'?/scanned pages and images are not supported/i:/סריקות ותמונות אינן נתמכות/);assert.match(message,/2/);assert.equal(/[א-ת]/.test(message),language==='he');assert.equal(f.reads,1);
});
test('unknown parser failures show safe English retry guidance',async()=>{
 const message=await fixture('en','internal parser failure').upload('broken.pdf');assert.match(message,/XLSX, CSV or PDF/);assert.equal(/[א-ת]/.test(message),false);assert.doesNotMatch(message,/internal parser/);
});
test('scanned PDF without a page number still explains the supported replacement',async()=>{
 const message=await fixture('en','לא נמצא טקסט שניתן לחלץ. PDF סרוק או תמונה אינם נתמכים; העלו PDF עם טקסט שניתן לסמן או קובץ Excel.').upload('scan.pdf');assert.match(message,/Scanned pages and images are not supported/);assert.match(message,/selectable text or an Excel file/);
});
test('specific Hebrew parser guidance remains available rather than becoming a generic failure',async()=>{
 const detail='ה־PDF מוגן בסיסמה. העלו עותק ללא סיסמה.';assert.equal(await fixture('he',detail).upload('locked.pdf'),detail);
});
