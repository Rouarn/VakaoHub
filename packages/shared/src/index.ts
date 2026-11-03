/**
 * VaKao Hub 前后端共享契约。
 *
 * Android 与桌面端共用同一套「应用 → 版本 → 产物」模型：
 * - Android 是 platform=android、format=apk；
 * - 桌面是 platform=darwin/win32、format=dmg/msi/zip，按 arch 区分。
 */

/** 支持的平台 */
export const PLATFORMS = ['android', 'darwin', 'win32', 'linux'] as const;
export type Platform = (typeof PLATFORMS)[number];

/** 支持的 CPU 架构；universal 表示一个包通吃 */
export const ARCHES = ['universal', 'arm64', 'x64'] as const;
export type Arch = (typeof ARCHES)[number];

/** 支持的产物格式 */
export const ARTIFACT_FORMATS = [
  'apk',
  'dmg',
  'msi',
  'exe',
  'zip',
  'appimage',
  'deb',
] as const;
export type ArtifactFormat = (typeof ARTIFACT_FORMATS)[number];

/** 发布渠道 */
export const CHANNELS = ['stable', 'beta'] as const;
export type Channel = (typeof CHANNELS)[number];
export const DEFAULT_CHANNEL: Channel = 'stable';

/** 版本状态：0 草稿 / 1 灰度 / 2 全量 / 3 已下架 */
export const RELEASE_STATUS = {
  DRAFT: 0,
  GRAY: 1,
  PUBLISHED: 2,
  OFFLINE: 3,
} as const;
export type ReleaseStatus = (typeof RELEASE_STATUS)[keyof typeof RELEASE_STATUS];

/** 客户端上报的事件类型 */
export const EVENT_TYPES = [
  'check',
  'download_start',
  'download_success',
  'download_fail',
  'verify_fail',
  'install_success',
  'install_fail',
  'launch',
  'open',
  'quit',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** 应用摘要（公开目录用） */
export interface AppSummary {
  id: number;
  appKey: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  category: string | null;
  repoUrl: string | null;
  homepage: string | null;
  docsUrl: string | null;
  releaseUrl: string | null;
}

/** 产物摘要 */
export interface ArtifactSummary {
  id: number;
  platform: Platform;
  arch: Arch;
  format: ArtifactFormat;
  fileName: string;
  size: number;
  sha256: string;
  minOs: string | null;
  notarized: boolean;
  downloadUrl: string;
}

/** 版本摘要 */
export interface ReleaseSummary {
  id: number;
  versionName: string;
  versionCode: number;
  channel: Channel;
  status: ReleaseStatus;
  forceUpdate: boolean;
  minVersionCode: number;
  updateLog: string | null;
  publishedAt: number | null;
  artifacts: ArtifactSummary[];
}

/** 目录项：一个应用 + 当前平台可用的最新版本 */
export interface CatalogApp extends AppSummary {
  latest: ReleaseSummary | null;
}

export interface CatalogResponse {
  platform: Platform;
  arch: Arch;
  apps: CatalogApp[];
}

/** 版本检查入参 */
export interface CheckQuery {
  appKey: string;
  platform: Platform;
  arch?: Arch;
  versionCode: number;
  channel?: Channel;
  deviceId?: string;
  versionName?: string;
}

/** 版本检查结果 */
export interface CheckResult {
  hasUpdate: boolean;
  appKey?: string;
  versionCode?: number;
  versionName?: string;
  channel?: Channel;
  forceUpdate?: boolean;
  minVersionCode?: number;
  updateLog?: string | null;
  publishedAt?: number | null;
  artifact?: ArtifactSummary;
}

/** 客户端事件上报 */
export interface ReportEventPayload {
  appKey: string;
  platform: Platform;
  arch?: Arch;
  type: EventType;
  deviceId?: string;
  releaseId?: number;
  artifactId?: number;
  fromVersionCode?: number;
  toVersionCode?: number;
}

/** 管理端分页响应 */
export interface Paginated<T> {
  records: T[];
  total: number;
  totalPages: number;
  current: number;
  size: number;
}
