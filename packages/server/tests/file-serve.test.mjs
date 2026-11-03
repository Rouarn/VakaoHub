import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { once } from 'node:events';
import { serveFile } from '../dist/utils/file-serve.js';

class FakeResponse extends PassThrough {
  constructor() {
    super();
    this.headersSent = false;
    this.headers = {};
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }
}

function fakeRequest() {
  const req = new PassThrough();
  req.headers = {};
  return req;
}

test('读文件出错时返回 500 而不是抛出未捕获异常', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vakao-serve-'));
  const res = new FakeResponse();
  const req = fakeRequest();

  // 目录可以 stat 成功，但 createReadStream 会以 EISDIR 失败
  await serveFile(dir, req, res, { fileName: 'app.dmg', etag: 'broken' });

  await once(res, 'finish');
  assert.equal(res.statusCode, 500);
  assert.equal(res.headers['content-type'], 'application/x-apple-diskimage');
});

test('正常文件按 ETag 命中返回 304', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vakao-serve-'));
  const file = join(dir, 'app.dmg');
  await writeFile(file, 'hello');

  const res = new FakeResponse();
  const req = fakeRequest();
  req.headers['if-none-match'] = '"etag-1"';

  await serveFile(file, req, res, { fileName: 'app.dmg', etag: 'etag-1' });
  assert.equal(res.statusCode, 304);
  assert.equal(res.writableEnded, true);
});

test('304 与 416 不视为已传输，200/206 才计数', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vakao-serve-'));
  const file = join(dir, 'app.dmg');
  await writeFile(file, 'hello');

  const notModified = new FakeResponse();
  const notModifiedReq = fakeRequest();
  notModifiedReq.headers['if-none-match'] = '"etag-2"';
  const served304 = await serveFile(file, notModifiedReq, notModified, {
    fileName: 'app.dmg',
    etag: 'etag-2',
  });
  assert.equal(served304, false);

  const invalidRange = new FakeResponse();
  const rangeReq = fakeRequest();
  rangeReq.headers.range = 'bytes=999999-';
  const served416 = await serveFile(file, rangeReq, invalidRange, {
    fileName: 'app.dmg',
    etag: 'etag-3',
  });
  assert.equal(served416, false);
  assert.equal(invalidRange.statusCode, 416);

  const partial = new FakeResponse();
  const partialReq = fakeRequest();
  partialReq.headers.range = 'bytes=0-1';
  const served206 = await serveFile(file, partialReq, partial, {
    fileName: 'app.dmg',
    etag: 'etag-4',
  });
  assert.equal(served206, true);
  assert.equal(partial.statusCode, 206);
  partial.destroy();

  const full = new FakeResponse();
  const fullReq = fakeRequest();
  const served200 = await serveFile(file, fullReq, full, {
    fileName: 'app.dmg',
    etag: 'etag-5',
  });
  assert.equal(served200, true);
  full.destroy();
});
