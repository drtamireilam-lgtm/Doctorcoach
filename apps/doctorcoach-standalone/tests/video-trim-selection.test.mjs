import test from 'node:test';
import assert from 'node:assert/strict';
import {trimSelection} from '../lib/video-trim-selection.ts';
test('trim handles seek to the chosen boundary without crossing each other',()=>{
 assert.deepEqual(trimSelection(20,0,20,'start',5),{start:5,end:20,preview:5});
 const end=trimSelection(20,5,20,'end',9);assert.equal(end.end,9);assert.equal(end.preview,8.99);
 assert.equal(trimSelection(20,5,9,'start',12).start,8.75);
 assert.equal(trimSelection(20,5,9,'end',1).end,5.25);
 assert.equal(trimSelection(20,5,9,'end',40).end,20);
 assert.equal(trimSelection(20,5,9,'start',-1).start,0);
 assert.throws(()=>trimSelection(20,0,20,'start',NaN));
});
