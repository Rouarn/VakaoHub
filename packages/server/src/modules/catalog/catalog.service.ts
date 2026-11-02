import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import type {
  ArtifactSummary,
  CatalogApp,
  CatalogResponse,
} from '@vakao/hub-shared';
import { env } from '../../config/env.js';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import {
  RELEASE_STATUS,
  ReleaseEntity,
} from '../../database/entities/release.entity.js';

@Injectable()
export class CatalogService {
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
    const apps = await this.apps.find({ order: { name: 'ASC' } });
    const items: CatalogApp[] = [];

    for (const app of apps) {
      const release = await this.findLatestPublished(
        app.id,
        channel,
        platform,
        arch,
      );
      if (!release) continue;

      const rows = await this.artifacts.find({
        where: { releaseId: release.id, platform },
      });
      const usable =
        arch === 'universal'
          ? rows
          : rows.filter(
              (row) => row.arch === arch || row.arch === 'universal',
            );
      if (!usable.length) continue;

      usable.sort((a, b) => {
        const score = (item: ArtifactEntity) => (item.arch === arch ? 0 : 1);
        return score(a) - score(b);
      });

      items.push({
        id: app.id,
        appKey: app.appKey,
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
        category: app.category,
        repoUrl: app.repoUrl,
        homepage: app.homepage,
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
          artifacts: usable.map((artifact) =>
            this.toArtifactSummary(artifact, req),
          ),
        },
      });
    }

    return {
      platform: platform as CatalogResponse['platform'],
      arch: arch as CatalogResponse['arch'],
      apps: items,
    };
  }

  private findLatestPublished(
    appId: number,
    channel: string,
    platform: string,
    arch: string,
  ): Promise<ReleaseEntity | null> {
    return this.releases
      .createQueryBuilder('r')
      .where('r.appId = :appId', { appId })
      .andWhere('r.channel = :channel', { channel })
      .andWhere('r.status = :status', { status: RELEASE_STATUS.PUBLISHED })
      .andWhere(
        arch === 'universal'
          ? 'EXISTS (SELECT 1 FROM hub_artifacts a WHERE a.releaseId = r.id AND a.platform = :platform)'
          : 'EXISTS (SELECT 1 FROM hub_artifacts a WHERE a.releaseId = r.id AND a.platform = :platform AND (a.arch = :arch OR a.arch = :universal))',
        arch === 'universal'
          ? { platform }
          : { platform, arch, universal: 'universal' },
      )
      .orderBy('r.versionCode', 'DESC')
      .limit(1)
      .getOne();
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
