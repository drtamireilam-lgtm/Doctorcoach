import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectGlb } from '../lib/anatomy-glb-inventory.ts';

function fixture(data) {
 const bytes = new TextEncoder().encode(JSON.stringify(data));
 const padded = Math.ceil(bytes.length / 4) * 4;
 const out = new ArrayBuffer(20 + padded);
 const v = new DataView(out);
 v.setUint32(0, 0x46546c67, true); v.setUint32(4, 2, true);
 v.setUint32(8, out.byteLength, true); v.setUint32(12, padded, true);
 v.setUint32(16, 0x4e4f534a, true);
 new Uint8Array(out, 20).fill(32);
 new Uint8Array(out, 20, bytes.length).set(bytes);
 return out;
}
test('reads mesh node names from valid GLB 2.0', () => {
 assert.deepEqual(inspectGlb(fixture({asset:{version:'2.0'},meshes:[{}],nodes:[{name:'DeltoidMesh',mesh:0},{name:'Group'}]})), {meshNodeNames:['DeltoidMesh'],meshCount:1});
});
test('rejects invalid mesh index', () => {
 assert.throws(() => inspectGlb(fixture({asset:{version:'2.0'},meshes:[],nodes:[{name:'X',mesh:0}]})), /Invalid mesh index/);
});
test('rejects corrupt header', () => {
 assert.throws(() => inspectGlb(new ArrayBuffer(20)), /Invalid GLB magic/);
});
