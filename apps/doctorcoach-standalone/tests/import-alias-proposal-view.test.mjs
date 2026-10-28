// Component rendering unit test, not a live browser / LAB download assertion.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

async function view(t,language){
 const root=resolve('.sites-runtime');mkdirSync(root,{recursive:true});
 const directory=mkdtempSync(join(root,'alias-view-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 // The fixture supplies language only; rendering, URI construction, filtering
 // and proposal generation use the actual production component and helper.
 const source=readFileSync(new URL('../components/import-alias-proposal-export.tsx',import.meta.url),'utf8')
  .replace("import {useLanguage} from './language-provider';",`const useLanguage=()=>({language:${JSON.stringify(language)}});`)
  .replace("'../lib/import-alias-proposals'",JSON.stringify(pathToFileURL(resolve('lib/import-alias-proposals.ts')).href));
 const code=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 const path=join(directory,'view.mjs');writeFileSync(path,code);
 return (await import(pathToFileURL(path).href)).ImportAliasProposalExport;
}
for(const language of ['he','en'])test('proposal download renders the current review-only payload in '+language,async t=>{
 const Component=await view(t,language);
 const render=source=>renderToStaticMarkup(createElement(Component,{items:[{source,exerciseId:'bench',version:3,owner:'SECRET'}],loading:false}));
 const html=render('Private spelling of press');assert.ok(html.includes('DoctorCoach-alias-proposals.json'));
 assert.ok(html.includes(language==='en'?'Download alias proposals for review':'הורדת הצעות כינויים לבדיקה'));
 const href=/href="([^"]+)"/.exec(html)[1];const report=JSON.parse(decodeURIComponent(href.split(',').slice(1).join(',')));
 assert.equal(report.mode,'proposals_only');assert.equal(report.proposals[0].source,'Private spelling of press');assert.ok(!JSON.stringify(report).includes('SECRET'));
 const next=render('Another spelling of press');assert.ok(!next.includes(encodeURIComponent('Private spelling of press')));assert.ok(next.includes(encodeURIComponent('Another spelling of press')));
 assert.equal(renderToStaticMarkup(createElement(Component,{items:[{source:'Private spelling of press',exerciseId:'bench'}],loading:true})), '');
 assert.equal(renderToStaticMarkup(createElement(Component,{items:[{source:'DB Bench Press',exerciseId:'bench'}],loading:false})), '');
});
