import test from 'node:test';
import assert from 'node:assert/strict';
import {importRowReview} from '../lib/import-review.ts';
import {exercises} from '../lib/content.ts';
const row=()=>({row:2,name:'Leg Press',sourceDay:'A',dayId:'1',exerciseId:'leg-press',sets:'3',reps:'8',weight:'',rpe:'8',rir:'',tempo:'',notes:'',unit:'reps',section:'main',issues:[],ignored:false});
test('review accepts only valid unique automatic or explicitly confirmed matches',()=>{
 assert.equal(importRowReview({...row(),matchStatus:'alias'},exercises).level,'matched');
 assert.equal(importRowReview({...row(),matchStatus:'suggested'},exercises).level,'review');
 assert.equal(importRowReview({...row(),matchStatus:'suggested',matchConfirmed:true},exercises).level,'matched');
 assert.equal(importRowReview({...row(),matchStatus:'alias',sets:'oops'},exercises).level,'invalid');
 assert.equal(importRowReview({...row(),exerciseId:'',matchStatus:'ambiguous'},exercises).level,'review');
 assert.equal(importRowReview({...row(),exerciseId:'',matchStatus:'unmatched'},exercises).level,'unmatched');
});
