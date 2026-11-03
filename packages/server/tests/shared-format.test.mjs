import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareVersion,
  formatBytes,
  formatDate,
  formatDateTime,
  pickArtifact,
  releaseUrl,
} from '@vakao/hub-shared';

test('formatBytes 三端口径：0 显示 0 B，缺失显示未知大小，单位到 TB', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(null), '未知大小');
  assert.equal(formatBytes(undefined), '未知大小');
  assert.equal(formatBytes(-1), '未知大小');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 ** 4), '5.0 TB');
});

test('formatDate / formatDateTime 兼容秒与毫秒，缺失返回 —', () => {
  assert.equal(formatDate(0), '—');
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate(1700000000), formatDate(1700000000000));
  assert.equal(formatDate(1700000000000), new Date(1700000000000).toLocaleDateString('zh-CN'));
  assert.equal(formatDateTime(0), '—');
});

test('compareVersion 忽略 v 前缀与预发布后缀', () => {
  assert.equal(compareVersion('v1.2.3', '1.2.3'), 0);
  assert.equal(compareVersion('1.2.3-beta.1', '1.2.3'), 0);
  assert.equal(compareVersion('1.10', '1.9'), 1);
  assert.equal(compareVersion('1.2', '1.2.0'), 0);
  assert.equal(compareVersion('1.2.0', '1.2.1'), -1);
});

test('releaseUrl 优先显式字段，其次由 repoUrl 推导', () => {
  assert.equal(releaseUrl({ releaseUrl: 'https://example.com/r' }), 'https://example.com/r');
  assert.equal(
    releaseUrl({ repoUrl: 'https://github.com/acme/app.git' }),
    'https://github.com/acme/app/releases',
  );
  assert.equal(releaseUrl({}), '');
});

test('pickArtifact 先架构精确匹配，再按格式偏好', () => {
  const artifacts = [
    { platform: 'darwin', arch: 'arm64', format: 'zip' },
    { platform: 'darwin', arch: 'arm64', format: 'dmg' },
    { platform: 'darwin', arch: 'universal', format: 'dmg' },
    { platform: 'win32', arch: 'x64', format: 'zip' },
  ];
  assert.equal(pickArtifact(artifacts, 'darwin', 'arm64').format, 'dmg');
  const universalOnly = artifacts.filter((item) => item.arch !== 'arm64');
  assert.equal(pickArtifact(universalOnly, 'darwin', 'arm64').format, 'dmg');
  assert.equal(pickArtifact(artifacts, 'linux', 'x64'), null);
});
