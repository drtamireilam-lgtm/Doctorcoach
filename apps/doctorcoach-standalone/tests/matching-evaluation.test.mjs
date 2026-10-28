import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateMatching} from '../scripts/evaluate-exercise-matching.mjs';
import {exerciseAliases} from '../lib/exercise-aliases.ts';
import {exercises} from '../lib/content.ts';
test('heldout reports abstention separately from correct automatic coverage',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/matching-heldout.json',import.meta.url),'utf8'));
 const report=evaluateMatching(fixture.cases);
 assert.equal(report.wrongMatches,0);assert.equal(report.accepted+report.review+report.unmatched,report.total);
 assert.equal(report.automaticCoverage,report.correct/report.resolvable);assert.ok(report.automaticCoverage>=0&&report.automaticCoverage<=1);
});
test('all curated aliases point to existing canonical catalog IDs',()=>{
 const ids=new Set(exercises.map(e=>e.id));for(const id of Object.keys(exerciseAliases))assert.ok(ids.has(id),id);
});

test('catalog audit separates duplicate IDs from ambiguous normalized names',async()=>{
 const {auditMatchingCatalog}=await import('../scripts/evaluate-exercise-matching.mjs');
 const report=auditMatchingCatalog([{id:'a',name:'Shared',en:'First'},{id:'b',name:'shared',en:'Second'}],{});
 assert.deepEqual(report.duplicateIds,[]);assert.deepEqual(report.collisions.find(c=>c.key==='shared').ids,['a','b']);
 assert.deepEqual(auditMatchingCatalog([{id:'a',name:'First',en:'One'},{id:'a',name:'Other',en:'Two'}],{}).duplicateIds,['a']);
});

test('evaluation reports only exercise labels and never echoes unrelated metadata',()=>{
 const report=evaluateMatching([{name:'Barbell Bench Press',expected:'barbell-bench',privateNote:'do-not-echo'}]);
 assert.ok(!JSON.stringify(report).includes('do-not-echo'));assert.equal(report.rows[0].name,'Barbell Bench Press');
});
