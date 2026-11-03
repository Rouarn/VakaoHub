import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

import { ensureStorage, pruneEmptyDir } from '../dist/utils/paths.js';

test('pruneEmptyDir 自下而上清理空版本目录', async () => {
  await ensureStorage();
  const appDir = await mkdtemp(join(process.cwd(), 'storage', 'prune-'));
  const versionDir = join(appDir, 'v1');
  await mkdir(versionDir);

  await pruneEmptyDir(versionDir);

  assert.equal(existsSync(versionDir), false);
  assert.equal(existsSync(appDir), false);
  await rm(appDir, { recursive: true, force: true });
});

test('pruneEmptyDir 遇到非空目录即停止', async () => {
  await ensureStorage();
  const appDir = await mkdtemp(join(process.cwd(), 'storage', 'prune-'));
  const versionDir = join(appDir, 'v1');
  await mkdir(versionDir);
  await mkdir(join(appDir, 'v2'));

  await pruneEmptyDir(versionDir);

  assert.equal(existsSync(versionDir), false);
  assert.equal(existsSync(appDir), true);
  await rm(appDir, { recursive: true, force: true });
});
