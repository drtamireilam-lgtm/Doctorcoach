import test from 'node:test';
import assert from 'node:assert/strict';
import {demoExerciseIds,filterLibraryExercises} from '../lib/exercise-library.ts';
const items=[{id:'squat',name:'סקוואט',en:'Squat',area:'ברך',group:'רגליים',kind:'רגיל',level:'בינוני'},{id:'row',name:'חתירה',en:'Row',area:'גב',group:'גב',kind:'רגיל',level:'קל'}];
const filters={search:'',area:'all',kind:'all',level:'all',favoritesOnly:false,favorites:[],videosOnly:false,demoIds:null};
test('demo availability counts only published ready demonstrations, without duplicate exercise badges',()=>{
 const base={exerciseId:'squat',kind:'demo',status:'ready',published:true};
 assert.equal(demoExerciseIds(null),null);
 assert.deepEqual([...demoExerciseIds([base,base,{...base,exerciseId:'row',published:false},{...base,exerciseId:'draft',status:'uploading'},{...base,exerciseId:'private',kind:'review'}])],['squat']);
 assert.equal(demoExerciseIds([]).size,0);
});
test('video-only filter intersects favorites and other filters rather than replacing them',()=>{
 const demoIds=new Set(['squat','row']);
 assert.deepEqual(filterLibraryExercises(items,{...filters,videosOnly:true,demoIds,favoritesOnly:true,favorites:['row'],area:'גב',level:'קל'}).map(e=>e.id),['row']);
 assert.deepEqual(filterLibraryExercises(items,{...filters,videosOnly:true,demoIds:new Set(['squat']),favoritesOnly:true,favorites:['row']}),[]);
});
test('unknown demo availability never fabricates a video match or removes ordinary browsing',()=>{
 assert.deepEqual(filterLibraryExercises(items,filters),items);
 assert.deepEqual(filterLibraryExercises(items,{...filters,videosOnly:true}),[]);
 assert.deepEqual(filterLibraryExercises(items,{...filters,videosOnly:true,demoIds:new Set()}),[]);
});
test('Hebrew and English searches normalize whitespace and case and retain group and kind filters',()=>{
 assert.deepEqual(filterLibraryExercises(items,{...filters,search:' SQUAT '}).map(e=>e.id),['squat']);
 assert.deepEqual(filterLibraryExercises(items,{...filters,search:'גב'}).map(e=>e.id),['row']);
 assert.deepEqual(filterLibraryExercises(items,{...filters,search:'סקוואט',kind:'שיקום'}),[]);
});
