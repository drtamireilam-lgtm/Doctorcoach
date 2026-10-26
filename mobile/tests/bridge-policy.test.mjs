import test from 'node:test';
import assert from 'node:assert/strict';
let policy;
try { policy = await import('../shared/bridge-policy.mjs'); } catch {}
test('bridge pins HTTPS origin, main frame and bounded commands', () => {
 assert.ok(policy, 'bridge policy implementation required');
 assert.equal(policy.acceptMessage('https://doctor.example','https://doctor.example',true,{command:'sync',requestId:'r',accountScope:'a'}),true);
 for (const [url,main,command] of [['https://evil.example',true,'sync'],['https://doctor.example',false,'sync'],['https://doctor.example',true,'eval']]) assert.equal(policy.acceptMessage('https://doctor.example',url,main,{command,requestId:'r',accountScope:'a'}),false);
});
test('invalidating binding suppresses old asynchronous health callbacks', () => {
 assert.ok(policy, 'binding implementation required');
 const binding = new policy.Binding(); binding.bind('a'); const ticket = binding.ticket(); binding.invalidate(); binding.bind('b'); assert.equal(binding.current(ticket),false); assert.equal(binding.current(binding.ticket()),true);
});
