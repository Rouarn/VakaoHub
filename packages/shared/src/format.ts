import type { ArtifactFormat, Arch, Platform } from './index.js';

/**
 * 跨端统一的展示口径（admin / website / launcher 三端共用同一套规则）：
 * - 字节：0 显示「0 B」，缺失或非法显示「未知大小」，单位 B/KB/MB/GB/TB，保留 1 位小数。
 * - 日期：兼容秒/毫秒时间戳，缺失显示「—」，按 zh-CN 输出。
 * - 版本：忽略前缀 v 与预发布后缀，逐段数字比较，缺段按 0。
 * - 发布页：优先 releaseUrl，其次由 repoUrl 推导 /releases。
 * - 产物：先按架构精确匹配，再按平台格式偏好排序取第一项。
 */

/** 各平台偏好的产物格式（顺序即优先级） */
export const PREFERRED_FORMATS: Record<Platform, ArtifactFormat[]> = {
  android: ['apk', 'zip'],
  darwin: ['dmg', 'zip'],
  win32: ['msi', 'exe', 'zip'],
  linux: ['appimage', 'deb', 'zip'],
};

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const;

/** 格式化字节数：0 → 「0 B」，缺失/非法 → 「未知大小」 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return '未知大小';
  }
  if (bytes === 0) return '0 B';
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    BYTE_UNITS.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(1)} ${BYTE_UNITS[index]}`;
}

function toDate(timestamp: number | null | undefined): Date | null {
  if (!timestamp || !Number.isFinite(timestamp) || timestamp < 0) return null;
  return new Date(timestamp > 1e12 ? timestamp : timestamp * 1000);
}

/** 格式化日期（仅日期） */
export function formatDate(timestamp: number | null | undefined): string {
  const date = toDate(timestamp);
  return date ? date.toLocaleDateString('zh-CN') : '—';
}

/** 格式化日期时间（精确到秒） */
export function formatDateTime(timestamp: number | null | undefined): string {
  const date = toDate(timestamp);
  return date ? date.toLocaleString('zh-CN', { hour12: false }) : '—';
}

/** 解析版本号各段数字，忽略 v 前缀与 -/+ 之后的预发布信息 */
export function versionParts(value: string): number[] {
  const trimmed = (value ?? '').trim().replace(/^v/i, '');
  const cut = trimmed.search(/[-+]/);
  const core = cut === -1 ? trimmed : trimmed.slice(0, cut);
  return core.split('.').map((piece) => {
    const number = parseInt(piece, 10);
    return Number.isFinite(number) ? number : 0;
  });
}

/** 比较两个版本号：a>b 返回 1，a<b 返回 -1，相等返回 0 */
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

/** 发布页地址：优先显式 releaseUrl，其次用 repoUrl 推导，均缺失返回空串 */
export function releaseUrl(app: {
  releaseUrl?: string | null;
  repoUrl?: string | null;
}): string {
  if (app.releaseUrl) return app.releaseUrl;
  if (!app.repoUrl) return '';
  return `${app.repoUrl.replace(/\.git$/, '').replace(/\/$/, '')}/releases`;
}

interface ArtifactLike {
  platform: string;
  arch: string;
  format: string;
}

/** 产物排序分值：架构精确匹配优先（0/1），其次格式偏好顺序，未知格式排最后 */
export function artifactScore(
  artifact: ArtifactLike,
  platform: string,
  arch: string,
): number {
  const preference = (PREFERRED_FORMATS as Record<string, string[]>)[platform] ?? [];
  const archScore = artifact.arch === arch ? 0 : 1;
  const formatIndex = preference.indexOf(artifact.format);
  const formatScore = formatIndex === -1 ? preference.length : formatIndex;
  return archScore * 100 + formatScore;
}

/** 按平台架构与格式偏好挑选产物；无可用项返回 null */
export function pickArtifact<T extends ArtifactLike>(
  artifacts: readonly T[],
  platform: string,
  arch: string,
): T | null {
  const candidates = artifacts.filter(
    (artifact) =>
      artifact.platform === platform &&
      (artifact.arch === arch || artifact.arch === 'universal'),
  );
  if (!candidates.length) return null;
  return candidates.reduce((best, artifact) =>
    artifactScore(artifact, platform, arch) <
    artifactScore(best, platform, arch)
      ? artifact
      : best,
  );
}
