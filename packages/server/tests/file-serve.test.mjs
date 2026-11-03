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
