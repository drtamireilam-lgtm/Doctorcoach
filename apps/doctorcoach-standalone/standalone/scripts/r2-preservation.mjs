// Read-only verification of locally exported R2 inventories and actual bytes.
// Never contacts a bucket, changes permissions or prints private object keys.
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {readFile, realpath, stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const fail = () => { throw new Error('R2 preservation verification failed'); };
const digest = value => createHash('sha256').update(value).digest('hex');
const httpFields = new Set(['contentType', 'contentLanguage', 'contentDisposition', 'contentEncoding', 'cacheControl', 'cacheExpiry']);
function metadata(value, http = false) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail();
  return Object.fromEntries(Object.keys(value).sort().map(key => {
    if (typeof value[key] !== 'string' || (http && !httpFields.has(key))) fail();
    if (http && key === 'cacheExpiry' && (!Number.isFinite(Date.parse(value[key])) || new Date(value[key]).toISOString() !== value[key])) fail();
    return [key, value[key]];
  }));
}
export async function r2Snapshot(manifestPath, objectDirectory) {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  // The exporter must finish pagination and assert completeness explicitly.
  if (manifest?.version !== 1 || manifest.complete !== true || !Array.isArray(manifest.objects) || manifest.objectCount !== manifest.objects.length) fail();
  const root = await realpath(objectDirectory), result = new Map();
  for (const object of manifest.objects) {
    if (typeof object.key !== 'string' || !object.key || typeof object.blobFile !== 'string' || !object.blobFile || path.isAbsolute(object.blobFile) || object.blobFile.split(/[\\/]/).some(p => p === '..') || !Number.isSafeInteger(object.size) || object.size < 0 || !/^[a-f0-9]{64}$/.test(object.sha256) || !['Standard', 'InfrequentAccess'].includes(object.storageClass)) fail();
    const keyHash = digest(object.key);
    if (result.has(keyHash)) fail();
    const full = await realpath(path.resolve(root, object.blobFile));
    if (!full.startsWith(root + path.sep)) fail();
    const info = await stat(full);
    if (!info.isFile() || info.size !== object.size) fail();
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(full)) hash.update(chunk);
    const sha256 = hash.digest('hex');
    if (sha256 !== object.sha256) fail();
    result.set(keyHash, {size: object.size, sha256, storageClass: object.storageClass,
      httpMetadata: metadata(object.httpMetadata, true), customMetadata: metadata(object.customMetadata)});
  }
  return Object.fromEntries([...result.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
export function compareR2Snapshots(before, after) {
  if (JSON.stringify(before) !== JSON.stringify(after)) fail();
  return true;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [oldManifest, oldObjects, newManifest, newObjects] = process.argv.slice(2);
    if (!oldManifest || !oldObjects || !newManifest || !newObjects) fail();
    compareR2Snapshots(await r2Snapshot(oldManifest, oldObjects), await r2Snapshot(newManifest, newObjects));
    console.log('R2 keys, bytes, HTTP/custom metadata and storage classes match.');
  } catch {
    console.error('R2 preservation verification failed; no private object details printed.');
    process.exitCode = 2;
  }
}
