import assert from 'node:assert/strict';
import test from 'node:test';

import { CatalogService } from '../dist/modules/catalog/catalog.service.js';

const apps = [
  { id: 1, appKey: 'alpha', name: 'Alpha', description: null, iconUrl: null, category: null, repoUrl: null, homepage: null, docsUrl: null, releaseUrl: null, themeColor: null },
  { id: 2, appKey: 'beta', name: 'Beta', description: null, iconUrl: null, category: null, repoUrl: null, homepage: null, docsUrl: null, releaseUrl: null, themeColor: null },
];

const releases = [
  { id: 10, appId: 1, versionName: '1.5.0', versionCode: 5, channel: 'stable', status: 2, forceUpdate: 0, minVersionCode: 0, updateLog: null, publishedAt: 1700000000 },
  { id: 20, appId: 2, versionName: '2.4.0', versionCode: 4, channel: 'stable', status: 2, forceUpdate: 1, minVersionCode: 3, updateLog: null, publishedAt: 1700000000 },
  { id: 11, appId: 1, versionName: '1.3.0', versionCode: 3, channel: 'stable', status: 2, forceUpdate: 0, minVersionCode: 0, updateLog: null, publishedAt: 1700000000 },
];

const artifacts = [
  { id: 101, releaseId: 10, platform: 'darwin', arch: 'arm64', format: 'zip', fileName: 'a.zip', size: 10, sha256: 'x', minOs: null, notarized: 0 },
  { id: 102, releaseId: 10, platform: 'darwin', arch: 'arm64', format: 'dmg', fileName: 'a.dmg', size: 10, sha256: 'x', minOs: null, notarized: 1 },
  { id: 103, releaseId: 10, platform: 'win32', arch: 'x64', format: 'msi', fileName: 'a.msi', size: 10, sha256: 'x', minOs: null, notarized: 0 },
  { id: 111, releaseId: 11, platform: 'darwin', arch: 'arm64', format: 'dmg', fileName: 'b.dmg', size: 10, sha256: 'x', minOs: null, notarized: 0 },
  { id: 201, releaseId: 20, platform: 'android', arch: 'universal', format: 'apk', fileName: 'b.apk', size: 10, sha256: 'x', minOs: null, notarized: 0 },
];

const req = { headers: { host: 'hub.example' }, protocol: 'http' };

function matches(row, where) {
  return Object.entries(where ?? {}).every(([key, value]) => {
    // In(...) 是 FindOperator，测试仓库忽略它（数据已按应用/版本预置）。
    if (value && typeof value === 'object') return true;
    return row[key] === value;
  });
}

function buildService() {
  const calls = { apps: 0, releases: 0, artifacts: 0 };
  const repo = (rows, key) => ({
    find: async ({ where } = {}) => {
      calls[key] += 1;
      return rows.filter((row) => matches(row, where));
    },
  });
  return {
    calls,
    service: new CatalogService(repo(apps, 'apps'), repo(releases, 'releases'), repo(artifacts, 'artifacts')),
  };
}

test('catalog 聚合：每个应用取有可用产物的最高版本，产物按偏好排序', async () => {
  const { service } = buildService();
  const result = await service.list('darwin', 'arm64', 'stable', req);

  assert.equal(result.apps.length, 1);
  assert.equal(result.apps[0].appKey, 'alpha');
  assert.equal(result.apps[0].latest.versionCode, 5);
  assert.equal(result.apps[0].latest.artifacts[0].format, 'dmg');
  assert.equal(
    result.apps[0].latest.artifacts[0].downloadUrl,
    'http://hub.example/api/v1/updates/download/102',
  );
  assert.equal(result.apps[0].latest.artifacts[0].notarized, true);
});

test('catalog 聚合：架构不匹配的版本被跳过', async () => {
  const { service } = buildService();
  const result = await service.list('win32', 'x64', 'stable', req);
  assert.deepEqual(
    result.apps.map((app) => app.appKey),
    ['alpha'],
  );
});

test('catalog summary 与官网原口径一致：跨平台去重应用数 + 有应用的平台数', async () => {
  const { service } = buildService();
  assert.deepEqual(await service.summary(), { totalApps: 2, totalPlatforms: 3 });
});

test('catalog 快照缓存：TTL 内重复请求不再查库', async () => {
  const { service, calls } = buildService();
  await service.list('darwin', 'arm64', 'stable', req);
  await service.list('darwin', 'arm64', 'stable', req);
  assert.equal(calls.apps, 1);
  assert.equal(calls.releases, 1);
  assert.equal(calls.artifacts, 1);
});
