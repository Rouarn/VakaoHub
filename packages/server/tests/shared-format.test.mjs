import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  compareVersion,
  formatBytes,
  formatDate,
  formatDateTime,
  pickArtifact,
  releaseUrl,
} from '@vakao/hub-shared';
import {
  formatBytes as launcherFormatBytes,
  formatDate as launcherFormatDate,
} from '../../launcher/frontend/src/lib/format.ts';
import { compareVersion as launcherCompareVersion } from '../../launcher/frontend/src/lib/version.ts';

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

/** website 无构建，函数是 app.js 内的局部实现；按大括号取出后执行，验证行为而非文本。 */
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `website 缺少 ${name}`);
  let depth = 0;
  for (let index = source.indexOf('{', start); index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`无法解析 ${name}`);
}

const website = readFileSync(
  fileURLToPath(new URL('../../website/app.js', import.meta.url)),
  'utf8',
);
const websiteFormatBytes = new Function(`return (${extractFunction(website, 'formatBytes')})`)();
const websiteFormatDate = new Function(`return (${extractFunction(website, 'formatDate')})`)();

test('website 与 launcher 的字节/日期副本实现和 shared 行为一致', () => {
  const byteFixtures = [0, null, undefined, -1, NaN, 1023, 1536, 5 * 1024 ** 4];
  const dateFixtures = [0, null, undefined, -1, 1700000000, 1700000000000];
  for (const value of byteFixtures) {
    assert.equal(websiteFormatBytes(value), formatBytes(value));
    assert.equal(launcherFormatBytes(value), formatBytes(value));
  }
  for (const value of dateFixtures) {
    assert.equal(websiteFormatDate(value), formatDate(value));
    assert.equal(launcherFormatDate(value), formatDate(value));
  }
});

test('launcher 的版本比较副本实现和 shared 行为一致', () => {
  const pairs = [
    ['v1.2.3', '1.2.3'],
    ['1.2.3-beta.1', '1.2.3'],
    ['1.10', '1.9'],
    ['1.2', '1.2.0'],
    ['1.2.0', '1.2.1'],
  ];
  for (const [left, right] of pairs) {
    assert.equal(launcherCompareVersion(left, right), compareVersion(left, right));
  }
});

