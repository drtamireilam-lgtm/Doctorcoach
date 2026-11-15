import test from 'node:test';
import assert from 'node:assert/strict';
import {positionAnnotation} from '../lib/anatomy-annotations.ts';

for(const width of [320,390,430,768,1280])for(const direction of ['rtl','ltr'])test(`annotation stays inside ${width}px ${direction} viewport`,()=>{
 for(const anchor of [{x:2,y:2},{x:width-2,y:550},{x:width/2,y:270},{x:-400,y:900}]){
  const p=positionAnnotation(anchor,{width,height:560},{width:Math.min(216,width-24),height:124},direction);
  assert.ok(p.left>=12&&p.top>=12);
  assert.ok(p.left+p.width<=width-12&&p.top+p.height<=548);
  assert.equal(p.anchor.x,Math.max(8,Math.min(width-8,anchor.x)));
 }
});
test('label follows projected geometry after camera movement',()=>{
 const a=positionAnnotation({x:100,y:200},{width:768,height:560},{width:216,height:124},'ltr');
 const b=positionAnnotation({x:440,y:320},{width:768,height:560},{width:216,height:124},'ltr');
 assert.notDeepEqual(a,b);assert.equal(b.anchor.x,440);assert.equal(b.anchor.y,320);
});
test('RTL prefers the opposite side without changing anatomical anchor',()=>{
 const args=[{x:384,y:240},{width:768,height:560},{width:216,height:124}];
 const ltr=positionAnnotation(...args,'ltr'),rtl=positionAnnotation(...args,'rtl');
 assert.ok(ltr.left>384);assert.ok(rtl.left+rtl.width<384);assert.deepEqual(ltr.anchor,rtl.anchor);
});
