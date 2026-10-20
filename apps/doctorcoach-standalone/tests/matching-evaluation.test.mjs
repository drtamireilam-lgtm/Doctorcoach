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
