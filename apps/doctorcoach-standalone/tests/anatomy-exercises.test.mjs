import test from 'node:test';
import assert from 'node:assert/strict';
import {anatomyHash,readAnatomyHash} from '../lib/anatomy-learning.ts';
import {muscleExerciseLinks,exerciseAnatomyLinks} from '../lib/anatomy-exercises.ts';
test('exercise context survives a muscle deep link round trip',()=>{
 const hash=anatomyHash({region:'shoulder',muscle:'deltoid',side:'both',view:'front',exercise:'landmine'});
 assert.equal(new URLSearchParams(hash.split('?')[1]).get('exercise'),'landmine');
 assert.equal(readAnatomyHash(hash,['shoulder'],['deltoid']).exercise,'landmine');
});
test('muscle relationships preserve existing strength roles and stretching targets',()=>{
 const links=muscleExerciseLinks('biceps-brachii');
 assert.ok(links.some(link=>link.id==='stretch-biceps-wall'&&link.role==='stretch'));
 assert.ok(links.some(link=>link.role==='primary'));
 for(const link of links)assert.ok(exerciseAnatomyLinks(link.id).some(reverse=>reverse.slug==='biceps-brachii'&&reverse.role===link.role));
 assert.deepEqual(muscleExerciseLinks('unknown'),[]);
 assert.deepEqual(exerciseAnatomyLinks('unknown'),[]);
});
test('invalid hash exercise context is ignored',()=>{
 assert.equal(readAnatomyHash('#learn?exercise=%3Cscript%3E',['shoulder'],[]).exercise,undefined);
});
test('legacy anatomy links retain their original state shape',()=>{
 const state={region:'shoulder',muscle:undefined,side:'both',view:'front',search:''};
 assert.deepEqual(readAnatomyHash('#learn',['shoulder'],[]),state);
});
test('workspace shows mapped exercise cards and an explicit route back to the context exercise',async()=>{
 const {readFile}=await import('node:fs/promises');
 const source=await readFile(new URL('../components/anatomy-workspace.tsx',import.meta.url),'utf8');
 assert.match(source,/<MuscleExercises[^>]+slug=\{muscle.slug\}/);
 assert.match(source,/onExercise\(contextExercise.id\)/);
});
test('legacy exercise aliases resolve to identical canonical muscle roles',async()=>{
 const {exerciseAliases}=await import('../lib/rehab-exercises.ts');
 for(const [alias,id] of Object.entries(exerciseAliases))assert.deepEqual(exerciseAnatomyLinks(alias),exerciseAnatomyLinks(id),alias);
});
test('exercise context is encoded once and remains canonical across hash updates',()=>{
 const state={region:'shoulder',muscle:'biceps-brachii',side:'both',view:'front',exercise:'hammer-curl'};
 const hash=anatomyHash(state);
 const restored=readAnatomyHash(hash,['shoulder'],['biceps-brachii']);
 assert.equal(anatomyHash(restored),hash);
 assert.equal(new URLSearchParams(hash.split('?')[1]).get('exercise'),'hammer-curl');
 assert.ok(!hash.includes('%25'));
});
