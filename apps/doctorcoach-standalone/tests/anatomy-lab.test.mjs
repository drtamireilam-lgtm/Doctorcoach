import test from 'node:test';import assert from 'node:assert/strict';
import {anatomyLabTarget} from '../lib/anatomy-lab.ts';
test('pending-review anatomy is permitted only in explicit experimental targets',()=>{
 assert.equal(anatomyLabTarget('local-development'),true);
 assert.equal(anatomyLabTarget('isolated-staging'),true);
 for(const target of [undefined,'','production','preview','staging','disabled'])assert.equal(anatomyLabTarget(target),false);
});
