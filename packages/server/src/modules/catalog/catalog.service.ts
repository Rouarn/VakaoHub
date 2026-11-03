import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { In, Repository } from 'typeorm';
import {
  artifactScore,
  PLATFORMS,
  type ArtifactSummary,
  type CatalogApp,
  type CatalogResponse,
} from '@vakao/hub-shared';
import { env } from '../../config/env.js';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import {
  RELEASE_STATUS,
  ReleaseEntity,
} from '../../database/entities/release.entity.js';

interface CatalogEntry {
  app: AppEntity;
  release: ReleaseEntity;
  artifacts: ArtifactEntity[];
}

interface CatalogSummary {
  totalApps: number;
  totalPlatforms: number;
}

/** 目录快照缓存时间：发布后最迟 10 秒在官网可见，避免每次首屏 2N 次查询。 */
const CACHE_TTL_MS = 10_000;

@Injectable()
export class CatalogService {
  private readonly catalogCache = new Map<
    string,
    { expiresAt: number; entries: CatalogEntry[] }
  >();

  private readonly summaryCache = new Map<
    string,
    { expiresAt: number; value: CatalogSummary }
  >();

  constructor(
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(ReleaseEntity)
    private readonly releases: Repository<ReleaseEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifacts: Repository<ArtifactEntity>,
  ) {}

  async list(
    platform: string,
    arch: string,
    channel: string,
    req: Request,
  ): Promise<CatalogResponse> {
    const entries = await this.loadEntries(platform, arch, channel);
    return {
      platform: platform as CatalogResponse['platform'],
      arch: arch as CatalogResponse['arch'],
      apps: entries.map((entry) => this.toCatalogApp(entry, req)),
    };
  }

  /** 官网首屏汇总：一次查询替代四个平台的目录请求。 */
  async summary(channel = 'stable'): Promise<CatalogSummary> {
    const key = `summary|${channel}`;
    const cached = this.summaryCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const apps = await this.apps.find();
    if (!apps.length) return { totalApps: 0, totalPlatforms: 0 };

    const releases = await this.releases.find({
      where: {
        appId: In(apps.map((app) => app.id)),
        channel,
        status: RELEASE_STATUS.PUBLISHED,
      },
    });
    if (!releases.length) return { totalApps: 0, totalPlatforms: 0 };

    const artifacts = await this.artifacts.find({
      where: { releaseId: In(releases.map((release) => release.id)) },
    });

    const appIdByRelease = new Map(
      releases.map((release) => [release.id, release.appId]),
    );
    const platformsByApp = new Map<number, Set<string>>();
    for (const artifact of artifacts) {
      const appId = appIdByRelease.get(artifact.releaseId);
      if (appId === undefined) continue;
      if (!(PLATFORMS as readonly string[]).includes(artifact.platform)) continue;
      const set = platformsByApp.get(appId) ?? new Set<string>();
      set.add(artifact.platform);
      platformsByApp.set(appId, set);
    }

    const platforms = new Set<string>();
    for (const set of platformsByApp.values()) {
      for (const platform of set) platforms.add(platform);
    }

    const value = { totalApps: platformsByApp.size, totalPlatforms: platforms.size };
    this.summaryCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
    return value;
  }

  private async loadEntries(
    platform: string,
    arch: string,
    channel: string,
  ): Promise<CatalogEntry[]> {
    const key = `${platform}|${arch}|${channel}`;
    const cached = this.catalogCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.entries;

    const entries = await this.queryEntries(platform, arch, channel);
    this.catalogCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, entries });
    return entries;
  }

  /** 一次取回应用、版本、产物后在内存里聚合，避免每个应用各查两次。 */
  private async queryEntries(
    platform: string,
    arch: string,
    channel: string,
  ): Promise<CatalogEntry[]> {
    const apps = await this.apps.find({ order: { name: 'ASC' } });
    if (!apps.length) return [];

    const releases = await this.releases.find({
      where: {
        appId: In(apps.map((app) => app.id)),
        channel,
        status: RELEASE_STATUS.PUBLISHED,
      },
      order: { versionCode: 'DESC' },
    });
    if (!releases.length) return [];

    const artifacts = await this.artifacts.find({
      where: {
        releaseId: In(releases.map((release) => release.id)),
        platform,
      },
    });

    const usableByRelease = new Map<number, ArtifactEntity[]>();
    for (const artifact of artifacts) {
      if (arch !== 'universal' && artifact.arch !== arch && artifact.arch !== 'universal') {
        continue;
      }
      const list = usableByRelease.get(artifact.releaseId) ?? [];
      list.push(artifact);
      usableByRelease.set(artifact.releaseId, list);
    }
    for (const list of usableByRelease.values()) {
      list.sort(
        (left, right) =>
          artifactScore(left, platform, arch) - artifactScore(right, platform, arch),
      );
    }

    // releases 已按 versionCode 倒序，每个应用取第一条在该平台架构有产物的版本。
    const releaseByApp = new Map<number, ReleaseEntity>();
    for (const release of releases) {
      if (releaseByApp.has(release.appId)) continue;
      if (usableByRelease.get(release.id)?.length) {
        releaseByApp.set(release.appId, release);
      }
    }

    const entries: CatalogEntry[] = [];
    for (const app of apps) {
      const release = releaseByApp.get(app.id);
      if (!release) continue;
      entries.push({
        app,
        release,
        artifacts: usableByRelease.get(release.id) ?? [],
      });
    }
    return entries;
  }

  private toCatalogApp(entry: CatalogEntry, req: Request): CatalogApp {
    const { app, release, artifacts } = entry;
    return {
      id: app.id,
      appKey: app.appKey,
      name: app.name,
      description: app.description,
      iconUrl: app.iconUrl,
      category: app.category,
      repoUrl: app.repoUrl,
      homepage: app.homepage,
      docsUrl: app.docsUrl,
      releaseUrl: app.releaseUrl,
      themeColor: app.themeColor,
      latest: {
        id: release.id,
        versionName: release.versionName,
        versionCode: release.versionCode,
        channel: release.channel as 'stable' | 'beta',
        status: release.status as 0 | 1 | 2 | 3,
        forceUpdate: release.forceUpdate === 1,
        minVersionCode: release.minVersionCode,
        updateLog: release.updateLog,
        publishedAt: release.publishedAt,
        artifacts: artifacts.map((artifact) => this.toArtifactSummary(artifact, req)),
      },
    };
  }

  private toArtifactSummary(
    artifact: ArtifactEntity,
    req: Request,
  ): ArtifactSummary {
    const path = `api/v1/updates/download/${artifact.id}`;
    let downloadUrl = '';
    if (env.publicBaseUrl) {
      downloadUrl = `${env.publicBaseUrl}/${path}`;
    } else {
      const proto =
        ((req.headers['x-forwarded-proto'] as string) ?? '')
          .split(',')[0]
          .trim() || req.protocol;
      const host =
        ((req.headers['x-forwarded-host'] as string) ?? '')
          .split(',')[0]
          .trim() || req.headers.host;
      downloadUrl = `${proto}://${host}/${path}`;
    }

    return {
      id: artifact.id,
      platform: artifact.platform as ArtifactSummary['platform'],
      arch: artifact.arch as ArtifactSummary['arch'],
      format: artifact.format as ArtifactSummary['format'],
      fileName: artifact.fileName,
      size: artifact.size,
      sha256: artifact.sha256,
      minOs: artifact.minOs,
      notarized: artifact.notarized === 1,
      downloadUrl,
    };
  }
}
