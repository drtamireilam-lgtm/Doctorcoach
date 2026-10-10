import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const origin = 'https://doctorcoach.test';
const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker(fetchImpl = async () => new Response('online')) {
  const handlers = {};
  const stored = new Map();
  const deleted = [];
  const caches = {
    async open() { return { async put(key, value) { stored.set(key, value); }, async match(key) { return stored.get(key); } }; },
    async keys() { return ['unrelated-app', 'doctorcoach-static-v0', 'doctorcoach-static-v1', 'doctorcoach-static-v2', 'doctorcoach-static-v3']; },
    async delete(key) { deleted.push(key); return true; },
  };
  vm.runInNewContext(source, {
    self: { location: { origin }, clients: { async claim() {} }, async skipWaiting() {}, addEventListener(type, callback) { handlers[type] = callback; } },
    caches, fetch: fetchImpl, URL, Response,
  });
  return { handlers, stored, deleted };
}
function request(app, path, { method = 'GET', mode = 'cors' } = {}) {
  let result;
  app.handlers.fetch({ request: { url: new URL(path, origin).href, method, mode }, respondWith(value) { result = value; } });
  return result;
}

test('manifest has launch targets and PNG icons with real declared dimensions', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/#plan');
  assert.equal(manifest.scope, '/');
  for (const icon of manifest.icons) {
    const bytes = await readFile(new URL('../public' + icon.src, import.meta.url));
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(bytes.readUInt32BE(16), width);
    assert.equal(bytes.readUInt32BE(20), height);
  }
});

test('service worker never intercepts APIs, auth, external requests or writes', () => {
  const app = worker();
  for (const path of ['/api/program', '/api/logs', '/signin-with-chatgpt', '/signout-with-chatgpt', '/callback', 'https://other.test/data']) {
    assert.equal(request(app, path, { mode: 'navigate' }), undefined, path);
  }
  assert.equal(request(app, '/api/logs', { method: 'POST' }), undefined);
  assert.equal(request(app, '/unknown-data.json'), undefined);
});

test('offline navigation returns a generic screen without caching the personal page', async () => {
  const app = worker(async () => { throw new Error('offline'); });
  app.stored.set('/offline.html', new Response('generic offline screen'));
  const result = await request(app, '/#plan', { mode: 'navigate' });
  assert.equal(await result.text(), 'generic offline screen');
  assert.deepEqual([...app.stored.keys()], ['/offline.html']);
});

test('online navigation always reaches the network and is not saved', async () => {
  let calls = 0;
  const app = worker(async () => { calls++; return new Response('private result'); });
  const result = await request(app, '/', { mode: 'navigate' });
  assert.equal(await result.text(), 'private result');
  assert.equal(calls, 1);
  assert.equal(app.stored.size, 0);
});

test('install does not cache redirects from the login gateway', async () => {
  const app = worker(async () => ({ ok: true, redirected: true }));
  let result;
  app.handlers.install({ waitUntil(value) { result = value; } });
  await assert.rejects(result, /Static asset unavailable/);
  assert.equal(app.stored.size, 0);
});

test('activation only removes old DoctorCoach caches', async () => {
  const app = worker();
  let result;
  app.handlers.activate({ waitUntil(value) { result = value; } });
  await result;
  assert.deepEqual(app.deleted, ['doctorcoach-static-v0', 'doctorcoach-static-v1', 'doctorcoach-static-v2']);
});
