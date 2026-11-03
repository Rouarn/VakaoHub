export function compareVersion(left: string, right: string): number {
  const a = left.split('.').map((part) => parseInt(part, 10) || 0);
  const b = right.split('.').map((part) => parseInt(part, 10) || 0);
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
