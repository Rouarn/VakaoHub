import test from 'node:test';
import assert from 'node:assert/strict';
import { UpdatesService } from '../dist/modules/updates/updates.service.js';
import { RELEASE_STATUS } from '../dist/database/entities/release.entity.js';

function buildService(release, artifact = { id: 7, releaseId: 1 }) {
  const repo = (row) => ({ findOne: async () => row });
  return new UpdatesService({}, repo(release), repo(artifact), {});
}

function isNotFound(error) {
  return typeof error?.getStatus === 'function' && error.getStatus() === 404;
}

test('灰度版本：命中灰度桶的设备可以下载', async () => {
  const service = buildService({
    id: 1,
    status: RELEASE_STATUS.GRAY,
    grayPercent: 100,
  });
  const result = await service.getDownloadable(7, 'device-1');
  assert.equal(result.artifact.id, 7);
  assert.equal(result.release.status, RELEASE_STATUS.GRAY);
});

test('100% 灰度等价全量，未带 deviceId 也可下载', async () => {
  const service = buildService({
    id: 1,
    status: RELEASE_STATUS.GRAY,
    grayPercent: 100,
  });
  const result = await service.getDownloadable(7);
  assert.equal(result.artifact.id, 7);
});

test('部分灰度：不带 deviceId 或未命中时按 404 隐藏', async () => {
  const service = buildService({
    id: 1,
    status: RELEASE_STATUS.GRAY,
    grayPercent: 50,
  });
  await assert.rejects(() => service.getDownloadable(7), isNotFound);

  const zero = buildService({
    id: 1,
    status: RELEASE_STATUS.GRAY,
    grayPercent: 0,
  });
  await assert.rejects(() => zero.getDownloadable(7, 'device-1'), isNotFound);
});

test('全量版本无需 deviceId 即可下载', async () => {
  const service = buildService({
    id: 1,
    status: RELEASE_STATUS.PUBLISHED,
    grayPercent: 0,
  });
  const result = await service.getDownloadable(7);
  assert.equal(result.release.status, RELEASE_STATUS.PUBLISHED);
});

test('已下架版本不可下载', async () => {
  const service = buildService({
    id: 1,
    status: RELEASE_STATUS.OFFLINE,
    grayPercent: 0,
  });
  await assert.rejects(() => service.getDownloadable(7), isNotFound);
});

test('灰度版本的下载链接带上 deviceId', () => {
  const service = buildService({ id: 1, status: RELEASE_STATUS.GRAY });
  const url = service.buildDownloadUrl(
    { headers: {}, protocol: 'http', get: () => 'localhost' },
    7,
    'device 1',
  );
  assert.match(url, /deviceId=device%201/);
});
