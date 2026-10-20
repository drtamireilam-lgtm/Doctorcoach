import test from 'node:test';
import assert from 'node:assert/strict';
import {exerciseIdFromFilename,videoFileProblem,VIDEO_LIMIT,duplicateExerciseIds,runVideoQueue} from '../lib/bulk-video.ts';
test('filenames match exact live identifiers, demo suffix and case but never invent aliases',()=>{
 const ids=new Set(['bench','barbell-bench','rdl','leg-press']);
 assert.equal(exerciseIdFromFilename('RDL.MP4',ids),'rdl');assert.equal(exerciseIdFromFilename('barbell-bench-demo.mp4',ids),'barbell-bench');
 for(const name of ['unknown.mp4','../rdl.mp4','rdl.mp4.exe','rdl (1).mp4'])assert.equal(exerciseIdFromFilename(name,ids),'');
 assert.equal(exerciseIdFromFilename('bench.mp4',ids),'bench');
});
test('bulk validation rejects mismatched file types and size outside existing storage limit',()=>{
 assert.equal(videoFileProblem({name:'rdl.mp4',type:'video/mp4',size:64}),'');
 for(const f of [{name:'rdl.exe',type:'video/mp4',size:64},{name:'rdl.mp4',type:'video/webm',size:64},{name:'rdl.webm',type:'video/webm',size:VIDEO_LIMIT+1},{name:'rdl.mp4',type:'video/mp4',size:0}])assert.ok(videoFileProblem(f));
});
test('duplicate exercise detection catches manual matches and excludes unmatched rows',()=>{
 assert.deepEqual([...duplicateExerciseIds([{exerciseId:'rdl'},{exerciseId:''},{exerciseId:'rdl'},{exerciseId:''}])],['rdl']);
});
test('queue limits parallel uploads, continues after failure and failed subset can be retried',async()=>{
 let active=0,max=0;const visited=[],failed=[];
 const errors=await runVideoQueue([1,2,3,4],async n=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,2));active--;visited.push(n);if(n===2){failed.push(n);throw new Error('network');}});
 assert.equal(max,2);assert.equal(errors.length,1);assert.deepEqual(visited.sort(),[1,2,3,4]);
 const retried=[];await runVideoQueue(failed,async n=>{retried.push(n);});assert.deepEqual(retried,[2]);
});
