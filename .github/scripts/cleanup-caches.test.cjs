'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { selectCachesToDelete, cleanup } = require('./cleanup-caches.cjs');
const cache = (id, key, ref = 'refs/heads/main') => ({
  id, key, ref, created_at: `2026-11-${String(id).padStart(2, '0')}T00:00:00Z`,
  size_in_bytes: 1024,
});

test('keeps the newest main cache per manager and ignores unrelated keys', () => {
  const caches = [
    cache(1, 'cpns-pip-v1-old'), cache(2, 'cpns-pip-v1-new'),
    cache(3, 'cpns-npm-v1-new'), cache(4, 'unrelated-cache'),
    cache(5, 'cpns-npm-v1-pr', 'refs/pull/1/merge'),
  ];
  assert.deepEqual(selectCachesToDelete(caches).map(c => c.id), [1, 5]);
});

test('removes legacy caches only after a main replacement exists', () => {
  const caches = [
    cache(1, 'setup-python-Linux-old'), cache(2, 'node-cache-Linux-npm-old'),
    cache(3, 'cpns-pip-v1-new'), cache(4, 'cpns-npm-v1-pr', 'refs/pull/1/merge'),
  ];
  assert.deepEqual(selectCachesToDelete(caches).map(c => c.id), [1]);
});

test('selects by creation time rather than API order or last access', () => {
  assert.deepEqual(selectCachesToDelete([
    cache(3, 'cpns-npm-new'), cache(1, 'cpns-npm-old'),
  ]).map(c => c.id), [1]);
  assert.deepEqual(selectCachesToDelete([]), []);
});

test('tolerates concurrent eviction and reports permission failures', async () => {
  const attempted = [];
  const warnings = [];
  const summary = [];
  const github = {
    paginate: async () => [1, 2, 3, 4].map(id => cache(id, `cpns-pip-${id}`)),
    rest: { actions: {
      getActionsCacheList: {},
      deleteActionsCacheById: async ({ cache_id }) => {
        attempted.push(cache_id);
        if (cache_id < 3) throw Object.assign(new Error('test'), { status: cache_id === 1 ? 404 : 403 });
      },
    } },
  };
  const core = {
    warning: text => warnings.push(text),
    summary: { addRaw: text => { summary.push(text); return { write: async () => {} }; } },
  };
  await cleanup({ github, context: { repo: { owner: 'owner', repo: 'repo' } }, core });
  assert.deepEqual(attempted, [1, 2, 3]);
  assert.equal(warnings.length, 1);
  assert.match(summary[0], /Removed 1 old caches/);
});
