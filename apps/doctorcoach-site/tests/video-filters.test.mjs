import test from 'node:test';
import assert from 'node:assert/strict';
import {filterManagedVideos} from '../lib/video-filters.ts';
const draft={exerciseId:'squat',caption:'זווית קדמית',published:false};
const published={exerciseId:'row',caption:'Side view',published:true};
const names=new Map([['squat','סקוואט Squat'],['row','חתירה Row']]);
test('draft queue and published filter preserve actual publication state',()=>{
 assert.deepEqual(filterManagedVideos([draft,published],'draft','',names),[draft]);
 assert.deepEqual(filterManagedVideos([draft,published],'published','',names),[published]);
 assert.equal(draft.published,false);
});
test('search combines selected status with Hebrew English names and captions',()=>{
 assert.deepEqual(filterManagedVideos([draft,published],'all',' SQUAT ',names),[draft]);
 assert.deepEqual(filterManagedVideos([draft,published],'all','קדמית',names),[draft]);
 assert.deepEqual(filterManagedVideos([draft,published],'draft','side',names),[]);
 assert.deepEqual(filterManagedVideos([],'all','',names),[]);
});
