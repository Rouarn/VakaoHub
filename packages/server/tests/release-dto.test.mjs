import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateReleaseDto } from '../dist/modules/releases/dto/update-release.dto.js';

async function validateVersionName(versionName) {
  const dto = plainToInstance(UpdateReleaseDto, { versionName });
  return validate(dto);
}

test('更新版本允许常规版本号', async () => {
  const errors = await validateVersionName('1.2.3-beta_1');
  assert.equal(errors.length, 0);
});

test('更新版本拒绝带路径分隔符的 versionName', async t => {
  for (const value of ['../evil', 'a/b', 'a\\b', '.hidden', '1.0 版']) {
    const errors = await validateVersionName(value);
    assert.equal(errors.length, 1, `${value} 应被拒绝`);
    assert.equal(errors[0].property, 'versionName');
    assert.match(errors[0].constraints?.matches ?? '', /versionName/);
  }
});
