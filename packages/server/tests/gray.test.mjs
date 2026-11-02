import test from 'node:test';
import assert from 'node:assert/strict';
import { grayHit } from '../dist/modules/updates/gray.js';

test('grayHit：100% 永远命中，0% 永远不命中', () => {
  assert.equal(grayHit(undefined, 100), true);
  assert.equal(grayHit('device-a', 100), true);
  assert.equal(grayHit('device-a', 0), false);
  assert.equal(grayHit(undefined, 50), false);
});

test('grayHit：同一设备结果稳定', () => {
  const first = grayHit('stable-device', 37);
  for (let index = 0; index < 20; index += 1) {
    assert.equal(grayHit('stable-device', 37), first);
  }
});

test('grayHit：扩大比例只会增加命中设备', () => {
  const device = 'monotonic-device';
  for (let percent = 0; percent <= 95; percent += 5) {
    if (grayHit(device, percent)) {
      assert.equal(grayHit(device, percent + 5), true);
    }
  }
});
