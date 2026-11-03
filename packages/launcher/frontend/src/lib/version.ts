// 与 @vakao/hub-shared/format 的 compareVersion 同一口径：忽略 v 前缀与预发布后缀。
function versionParts(value: string): number[] {
  const trimmed = (value || '').trim().replace(/^v/i, '');
  const cut = trimmed.search(/[-+]/);
  const core = cut === -1 ? trimmed : trimmed.slice(0, cut);
  return core.split('.').map((part) => parseInt(part, 10) || 0);
}

export function compareVersion(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const x = a[index] ?? 0;
    const y = b[index] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function satisfiesMinimum(minimum: string, current: string): boolean {
  if (!minimum || !current) return true;
  return compareVersion(current, minimum) >= 0;
}
