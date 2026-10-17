import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('switching OTP email restores email entry',async()=>{
 const page=await readFile(new URL('../standalone/page.ts',import.meta.url),'utf8');
 const start=page.indexOf("el('switch-email')?.addEventListener");
 assert.ok(start>=0);
 const handler=page.slice(start,page.indexOf('});',start)+3);
 assert.ok(handler.includes("el('code-form').hidden=true"));
 assert.ok(handler.includes("el('email-form').hidden=false"));
});
