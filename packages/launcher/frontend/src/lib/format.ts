export function initial(name: string): string {
  return (name || '?').trim().charAt(0).toUpperCase();
}

// 与 @vakao/hub-shared/format 保持同一口径（launcher 前端是独立 npm 包，无法引用 workspace 包）。
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return '未知大小';
  }
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`;
}

export function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) return '—';
  return new Date(timestamp > 1e12 ? timestamp : timestamp * 1000).toLocaleDateString('zh-CN');
}

export function percentOf(percent: number | undefined): string {
  if (percent === undefined || percent < 0) return '0%';
  return `${Math.min(100, percent)}%`;
}
