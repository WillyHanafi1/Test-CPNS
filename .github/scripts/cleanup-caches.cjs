'use strict';

// Keep one replacement per dependency manager, on main. Other cache keys are
// untouched. Legacy setup-node/setup-python caches go only after replacement.
function selectCachesToDelete(caches) {
  const families = [
    { current: 'cpns-pip-', legacy: 'setup-python-' },
    { current: 'cpns-npm-', legacy: 'node-cache-' },
  ];
  const deleted = [];
  for (const family of families) {
    const current = caches.filter(cache => cache.key.startsWith(family.current));
    const main = current.filter(cache => cache.ref === 'refs/heads/main');
    main.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    if (!main.length) continue;
    deleted.push(...current.filter(cache => cache.id !== main[0].id));
    deleted.push(...caches.filter(cache => cache.key.startsWith(family.legacy)));
  }
  return deleted;
}

async function cleanup({ github, context, core }) {
  const caches = await github.paginate(github.rest.actions.getActionsCacheList, {
    ...context.repo, per_page: 100,
  });
  const obsolete = selectCachesToDelete(caches);
  let removed = 0;
  let bytes = 0;
  for (const cache of obsolete) {
    try {
      await github.rest.actions.deleteActionsCacheById({
        ...context.repo, cache_id: cache.id,
      });
      removed += 1;
      bytes += cache.size_in_bytes || 0;
    } catch (error) {
      if (error.status !== 404) core.warning(`Cache ${cache.id}: ${error.message}`);
    }
  }
  await core.summary.addRaw(
    `Removed ${removed} old caches (${(bytes / 1024 / 1024).toFixed(1)} MiB). ` +
    'Kept the latest pip/npm caches. No build artifacts were uploaded.'
  ).write();
}

module.exports = { selectCachesToDelete, cleanup };
