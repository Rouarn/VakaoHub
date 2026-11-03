import type {
  Arch,
  ArtifactFormat,
  Channel,
  EventType,
  Platform,
  ReleaseStatus,
} from '@vakao/hub-shared';

export type { Paginated } from '@vakao/hub-shared';

export interface AppRow {
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
  themeColor: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ArtifactRow {
  id: number;
  releaseId: number;
  platform: Platform;
  arch: Arch;
  format: ArtifactFormat;
  fileName: string;
  relPath: string;
  size: number;
  sha256: string;
  minOs: string | null;
  notarized: number;
  downloadCount: number;
  createdAt: number;
}

export interface ReleaseRow {
  id: number;
  appId: number;
  versionName: string;
  versionCode: number;
  channel: Channel;
  status: ReleaseStatus;
  grayPercent: number;
  forceUpdate: number;
  minVersionCode: number;
  updateLog: string | null;
  publishedAt: number | null;
  offlineReason: string | null;
  createdAt: number;
  updatedAt: number;
  artifacts?: ArtifactRow[];
  app?: AppRow;
}

export interface EventRow {
  id: number;
  appId: number;
  releaseId: number | null;
  artifactId: number | null;
  deviceId: string | null;
  platform: Platform;
  arch: Arch | null;
  type: EventType;
  fromVersionCode: number | null;
  toVersionCode: number | null;
  createdAt: number;
}

export interface Stats {
  counts: {
    apps: number;
    releases: number;
    artifacts: number;
    events: number;
  };
  storageBytes: number;
  downloads: number;
  eventsLast7Days: { type: EventType; count: number }[];
  latestReleases: {
    id: number;
    appKey: string;
    appName: string;
    versionName: string;
    versionCode: number;
    status: ReleaseStatus;
    createdAt: number;
  }[];
}

export interface LoginResult {
  accessToken: string;
  tokenType: string;
  expiresIn: string;
  username: string;
}

export interface Funnel {
  since: number;
  appId: number | null;
  counts: Record<string, number>;
  rates: {
    download: number;
    install: number;
  };
}

export interface AuditLog {
  id: number;
  username: string | null;
  method: string;
  path: string;
  statusCode: number;
  ip: string | null;
  createdAt: number;
}
