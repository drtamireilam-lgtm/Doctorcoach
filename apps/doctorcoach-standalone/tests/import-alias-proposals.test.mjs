import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseAliases} from '../lib/exercise-aliases.ts';

const propose=async values=>{const {proposeImportAliases}=await import('../lib/import-alias-proposals.ts');return proposeImportAliases(values);};
test('saved corrections generate review-only names without account or prescription metadata',async()=>{
 const result=await propose([{source:'Coach DB chest press spelling',exerciseId:'bench',version:5,owner:'PRIVATE',notes:'PRIVATE',weight:100}]);
 assert.equal(result.schemaVersion,1);assert.equal(result.mode,'proposals_only');assert.equal(result.proposals.length,1);
 assert.equal(result.proposals[0].state,'needs_review');assert.equal(result.proposals[0].exerciseId,'bench');assert.equal(result.proposals[0].source,'Coach DB chest press spelling');
 assert.ok(!JSON.stringify(result).includes('PRIVATE'));assert.ok(!JSON.stringify(result).includes('weight'));assert.ok(!JSON.stringify(result).includes('version'));
});
test('existing exact aliases and private custom IDs are omitted from shared proposals',async()=>{
 const result=await propose([{source:'DB Bench Press',exerciseId:'bench',version:1},{source:'My Private Exercise',exerciseId:'custom:someone',version:1}]);
 assert.equal(result.proposals.length,0);assert.equal(result.omitted,2);
});
test('conflicting correction candidates stay flagged and never mutate shared names',async()=>{
 const before=JSON.stringify(exerciseAliases);
 const result=await propose([{source:'Bench Press',exerciseId:'bench',version:1},{source:'incline flat dumbbell press',exerciseId:'bench',version:1},{source:'Barbell Bench Press',exerciseId:'bench',version:1}]);
 assert.equal(result.proposals.length,3);
 assert.ok(result.proposals[0].flags.includes('existing_other_match'));
 assert.ok(result.proposals[1].flags.includes('conflicting_qualifiers'));
 assert.ok(result.proposals[2].flags.includes('existing_other_match'));
 assert.ok(result.proposals.every(p=>p.state==='needs_review'));assert.equal(JSON.stringify(exerciseAliases),before);
});
test('input validation deduplicates normalized pairs and never echoes rejected fields',async()=>{
 const result=await propose([{source:'My DB chest press',exerciseId:'bench'},{source:'My dumbbell chest press',exerciseId:'bench'},{source:'',exerciseId:'bench'},{source:'bad\nrow',exerciseId:'bench'},{source:'x'.repeat(101),exerciseId:'bench'}]);
 assert.equal(result.proposals.length,1);assert.equal(result.omitted,4);
});
test('proposals retain ambiguous corrections as explicit review choices',async()=>{
 const result=await propose([{source:'Leg Curl',exerciseId:'lying-curl'}]);
 assert.equal(result.proposals[0].exerciseId,'lying-curl');assert.ok(result.proposals[0].flags.includes('existing_other_match'));
 assert.ok(result.proposals[0].currentCandidates.includes('movement-leg-curl'));
});

test('word-order-equivalent proposals to different targets are flagged together',async()=>{
 const result=await propose([{source:'unusual chest cable press',exerciseId:'bench'},{source:'chest unusual press cable',exerciseId:'barbell-bench'}]);
 assert.equal(result.proposals.length,2);assert.ok(result.proposals.every(p=>p.flags.includes('conflicting_proposals')));
});

test('proposal export is bounded by the persisted memory limit',async()=>{
 const result=await propose(Array.from({length:260},(_,i)=>({source:'Unlisted spelling number '+i,exerciseId:'bench'})));
 assert.equal(result.proposals.length,250);assert.equal(result.omitted,10);
 assert.ok(JSON.stringify(result).length<150000);
});
