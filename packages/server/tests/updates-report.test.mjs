import assert from 'node:assert/strict';
import test from 'node:test';

import { UpdatesService } from '../dist/modules/updates/updates.service.js';

const app = { id: 1, appKey: 'alpha' };
const otherApp = { id: 2, appKey: 'beta' };

function buildService() {
  const saved = [];
  const apps = { findOne: async ({ where }) => (where.appKey === app.appKey ? app : null) };
  const releases = {
    findOne: async ({ where }) => {
      if (where.id === 10 && where.appId === 1) return { id: 10, appId: 1 };
      if (where.id === 20 && where.appId === 2) return { id: 20, appId: 2 };
      return null;
    },
  };
  const artifacts = {
    findOne: async ({ where }) => {
      if (where.id === 100) return { id: 100, releaseId: 10 };
      if (where.id === 200) return { id: 200, releaseId: 20 };
      return null;
    },
  };
  const events = {
    create: (value) => value,
    save: async (value) => {
      saved.push(value);
      return value;
    },
  };
  return { service: new UpdatesService(apps, releases, artifacts, events), saved };
}

const base = { appKey: 'alpha', platform: 'darwin', type: 'check', deviceId: 'dev-1' };

test('埋点归属校验：未知应用不落库', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, appKey: 'missing' });
  assert.equal(saved.length, 0);
});

test('埋点归属校验：版本不属于该应用时丢弃', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, releaseId: 20, artifactId: 200 });
  assert.equal(saved.length, 0);
});

test('埋点归属校验：产物不属于所报版本时丢弃', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, releaseId: 10, artifactId: 200 });
  assert.equal(saved.length, 0);
});

test('埋点归属校验：合法事件落库', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, releaseId: 10, artifactId: 100 });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].appId, 1);
  assert.equal(saved[0].releaseId, 10);
  assert.equal(saved[0].artifactId, 100);
});

test('埋点归属校验：只带产物时回填所属版本', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, artifactId: 100 });
  assert.equal(saved.length, 1);
  assert.equal(saved[0].releaseId, 10);
});

test('埋点归属校验：伪造产物 ID 丢弃', async () => {
  const { service, saved } = buildService();
  await service.report({ ...base, artifactId: 999 });
  assert.equal(saved.length, 0);
});
