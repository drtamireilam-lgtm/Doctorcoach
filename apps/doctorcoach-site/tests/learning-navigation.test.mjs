import test from 'node:test';
import assert from 'node:assert/strict';
import {learningTopic,learningArticleHref,learningTopics} from '../lib/learning-navigation.ts';
test('every guide has a direct local link that restores the selected article',()=>{
 for(const topic of learningTopics)assert.equal(learningTopic(learningArticleHref(topic)),topic);
});
test('body-map links stay in the anatomical view instead of choosing an unrelated article',()=>{
 for(const hash of ['#learn','#learn?region=thigh','#learn?region=shoulder&muscle=deltoid'])assert.equal(learningTopic(hash),null);
});
test('unrelated routes and unknown article values cannot select a guide',()=>{
 for(const hash of ['#care?article=rpe','#learn?article=unknown','#learn?article=https%3A%2F%2Fevil.test','#learn?article=',''])assert.equal(learningTopic(hash),null);
 assert.equal(learningTopic('#learn?article=rpe&region=thigh'),'rpe');
});
