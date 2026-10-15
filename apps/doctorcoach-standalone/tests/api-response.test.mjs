import test from 'node:test';
import assert from 'node:assert/strict';
import {apiResponseFailure} from '../lib/api-response.ts';
const response={ok:true,status:200,redirected:false,url:'https://example.test/api/training'};
test('HTML login redirect cannot masquerade as a successful empty program or completed write',()=>{
 for(const url of ['https://chatgpt.com/auth/login','https://example.test/signin-with-chatgpt'])assert.equal(apiResponseFailure({...response,url,redirected:true},false).status,401);
 assert.equal(apiResponseFailure({...response,status:401,ok:false},true).status,401);
});
test('non-JSON gateway responses are retryable errors, while valid API responses retain domain errors',()=>{
 assert.equal(apiResponseFailure(response,false).status,502);
 assert.equal(apiResponseFailure({...response,status:503,ok:false},false).status,503);
 assert.equal(apiResponseFailure(response,true),null);
 assert.equal(apiResponseFailure({...response,status:409,ok:false},true),null);
});
