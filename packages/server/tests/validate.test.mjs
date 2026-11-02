import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesMagic } from '../dist/modules/artifacts/validate.js';

const tail = Buffer.alloc(512);

test('ZIP/APK 魔数', () => {
  assert.equal(matchesMagic('apk', Buffer.from([0x50, 0x4b, 0x03, 0x04]), tail), true);
  assert.equal(matchesMagic('zip', Buffer.from([0x50, 0x4b, 0x05, 0x06]), tail), true);
  assert.equal(matchesMagic('apk', Buffer.from('MZ'), tail), false);
});

test('MSI/EXE/ELF/DEB 魔数', () => {
  assert.equal(matchesMagic('msi', Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]), tail), true);
  assert.equal(matchesMagic('exe', Buffer.from('MZ'), tail), true);
  assert.equal(matchesMagic('appimage', Buffer.from([0x7f, 0x45, 0x4c, 0x46]), tail), true);
  assert.equal(matchesMagic('deb', Buffer.from('!<arch>\n'), tail), true);
});

test('DMG 依赖尾部 koly', () => {
  const dmgTail = Buffer.concat([Buffer.from('junk'), Buffer.from('koly'), Buffer.alloc(500)]);
  assert.equal(matchesMagic('dmg', Buffer.alloc(16), dmgTail), true);
  assert.equal(matchesMagic('dmg', Buffer.alloc(16), Buffer.alloc(512)), false);
});
