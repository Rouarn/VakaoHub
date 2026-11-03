import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../..', import.meta.url));
const tokensPath = join(root, 'shared/design/tokens.css');
const websitePath = join(root, 'website/styles.css');
const launcherPath = join(root, 'launcher/frontend/src/style.css');
const adminPath = join(root, 'admin/src');
const designDocPath = join(root, '..', 'docs/design-system.md');

/** 三端共享颜色令牌；字体栈各端允许有本地回退差异，不参与比较。 */
const SHARED_COLOR_TOKENS = [
  '--paper',
  '--raised',
  '--ink',
  '--strong',
  '--muted',
  '--faint',
  '--line',
  '--line-soft',
  '--accent',
  '--orange',
  '--blue',
  '--purple',
  '--yellow',
];

function read(filePath) {
  return readFileSync(filePath, 'utf8');
}

function parseRootBlock(css) {
  const match = css.match(/:root\s*\{([^}]*)\}/);
  assert.ok(match, '缺少 :root 块');
  const tokens = new Map();
  for (const line of match[1].split('\n')) {
    const declaration = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);\s*$/);
    if (declaration) tokens.set(declaration[1], declaration[2].trim());
  }
  return tokens;
}

function normalize(value) {
  return value.replace(/\s+/g, '').replace(/0\./g, '.').toLowerCase();
}

test('website 与 launcher 的共享颜色令牌和 tokens.css 一致', () => {
  const source = parseRootBlock(read(tokensPath));
  for (const filePath of [websitePath, launcherPath]) {
    const tokens = parseRootBlock(read(filePath));
    for (const name of SHARED_COLOR_TOKENS) {
      assert.ok(source.has(name), `tokens.css 缺少 ${name}`);
      assert.ok(tokens.has(name), `${filePath} 缺少 ${name}`);
      assert.equal(
        normalize(tokens.get(name)),
        normalize(source.get(name)),
        `${filePath} 的 ${name} 与 tokens.css 不一致`,
      );
    }
  }
});

test('admin 样式只引用 CSS 变量，不再有硬编码颜色', () => {
  const files = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const target = join(dir, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (extname(entry.name) === '.css' || extname(entry.name) === '.vue') files.push(target);
    }
  };
  walk(adminPath);

  for (const filePath of files) {
    const source = read(filePath);
    const styleBlocks =
      extname(filePath) === '.vue'
        ? [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1])
        : [source];
    for (const block of styleBlocks) {
      assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}/, `${filePath} 含硬编码十六进制色值`);
      assert.doesNotMatch(block, /rgba?\(/, `${filePath} 含硬编码 rgba/rgb 色值`);
    }
  }
});

test('design-system.md 的令牌表与 tokens.css 一致', () => {
  const source = parseRootBlock(read(tokensPath));
  const doc = read(designDocPath);
  for (const match of doc.matchAll(/^\| `(--[a-z-]+)` \| `([^`]+)` \|/gm)) {
    const [, name, value] = match;
    assert.ok(source.has(name), `tokens.css 缺少文档声明的 ${name}`);
    assert.equal(normalize(source.get(name)), normalize(value), `${name} 与文档不一致`);
  }
});
