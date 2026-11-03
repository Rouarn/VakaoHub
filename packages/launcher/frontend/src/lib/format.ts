export function initial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return '—';
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toLocaleDateString('zh-CN');
}

export function percentOf(percent: number | undefined): string {
  if (percent === undefined || percent < 0) return '0%';
  return `${Math.min(100, percent)}%`;
}
