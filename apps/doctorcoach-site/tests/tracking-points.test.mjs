import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingPoints,trackingDomain} from '../lib/tracking-points.ts';
const row=(id,day,value,updatedAt=day)=>({id,day,updatedAt,kind:'readiness',data:{energy:value}});
test('trend points preserve zero, omit missing or nonfinite values and do not reorder the source',()=>{
 const rows=[row('b','2026-10-08',0),row('a','2026-10-07',7),row('c','2026-10-09',null),row('d','2026-10-09',Infinity),row('e','2026-10-09','5')];
 assert.deepEqual(trackingPoints(rows,'energy'),[{date:'2026-10-07',value:7},{date:'2026-10-08',value:0}]);
 assert.equal(rows[0].id,'b');
});
test('trend window keeps the latest sixty values in ascending date/update order',()=>{
 const rows=Array.from({length:65},(_,i)=>row(String(i),'2026-10-09',i,String(i).padStart(3,'0'))).reverse();
 const points=trackingPoints(rows,'energy');assert.equal(points.length,60);assert.equal(points[0].value,5);assert.equal(points.at(-1).value,64);
});
test('readiness scales stay separate and do not create a combined readiness score',()=>{
 for(const metric of ['energy','stress','pain','adherence'])assert.deepEqual(trackingDomain(metric),[0,10]);
 assert.deepEqual(trackingDomain('sleep'),[0,24]);assert.deepEqual(trackingDomain('weight'),['auto','auto']);
});
