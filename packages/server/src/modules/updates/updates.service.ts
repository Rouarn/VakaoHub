import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import type {
  ArtifactSummary,
  CheckResult,
} from '@vakao/hub-shared';
import { env } from '../../config/env.js';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ClientEventEntity } from '../../database/entities/client-event.entity.js';
import {
  RELEASE_STATUS,
  ReleaseEntity,
} from '../../database/entities/release.entity.js';
import type { CheckUpdateQueryDto } from './dto/check-update-query.dto.js';
import { grayHit } from './gray.js';
import { pickArtifact as pickPreferredArtifact } from '@vakao/hub-shared';
import type { ReportEventDto } from './dto/report-event.dto.js';

@Injectable()
export class UpdatesService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(ReleaseEntity)
    private readonly releases: Repository<ReleaseEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifacts: Repository<ArtifactEntity>,
    @InjectRepository(ClientEventEntity)
    private readonly events: Repository<ClientEventEntity>,
  ) {}

  async check(query: CheckUpdateQueryDto, req: Request): Promise<CheckResult> {
    const app = await this.apps.findOne({ where: { appKey: query.appKey } });
    if (!app) return { hasUpdate: false };

    const channel = query.channel ?? 'stable';
    const arch = query.arch ?? 'universal';

    let release = await this.findLatest(app.id, channel, query.platform, arch, [
      RELEASE_STATUS.GRAY,
      RELEASE_STATUS.PUBLISHED,
    ]);

    if (
      release &&
      release.status === RELEASE_STATUS.GRAY &&
      !grayHit(query.deviceId, release.grayPercent)
    ) {
      release = await this.findLatest(
        app.id,
        channel,
        query.platform,
        arch,
        [RELEASE_STATUS.PUBLISHED],
      );
    }

    if (!release || query.versionCode >= release.versionCode) {
      return { hasUpdate: false };
    }

    const artifact = await this.pickArtifact(release.id, query.platform, arch);
    if (!artifact) return { hasUpdate: false };

    return {
      hasUpdate: true,
      appKey: app.appKey,
      versionCode: release.versionCode,
      versionName: release.versionName,
      channel: release.channel as 'stable' | 'beta',
      forceUpdate:
        release.forceUpdate === 1 || query.versionCode < release.minVersionCode,
      minVersionCode: release.minVersionCode,
      updateLog: release.updateLog,
      publishedAt: release.publishedAt,
      artifact: this.toArtifactSummary(
        artifact,
        req,
        release.status === RELEASE_STATUS.GRAY ? query.deviceId : undefined,
      ),
    };
  }

  async getDownloadable(
    artifactId: number,
    deviceId?: string,
  ): Promise<{ artifact: ArtifactEntity; release: ReleaseEntity }> {
    const artifact = await this.artifacts.findOne({
      where: { id: artifactId },
    });
    if (!artifact) throw new NotFoundException('产物不存在');

    const release = await this.releases.findOne({
      where: { id: artifact.releaseId },
    });
    if (
      !release ||
      (release.status !== RELEASE_STATUS.GRAY &&
        release.status !== RELEASE_STATUS.PUBLISHED)
    ) {
      throw new NotFoundException('该版本已下架');
    }
    // 灰度版本只对命中灰度桶的设备开放下载，避免按产物 ID 猜地址绕过灰度
    if (
      release.status === RELEASE_STATUS.GRAY &&
      !grayHit(deviceId, release.grayPercent)
    ) {
      throw new NotFoundException('该版本未开放下载');
    }
    return { artifact, release };
  }

  async countDownload(artifactId: number): Promise<void> {
    await this.artifacts.increment({ id: artifactId }, 'downloadCount', 1);
  }

  async report(dto: ReportEventDto): Promise<{ success: true }> {
    const app = await this.apps.findOne({ where: { appKey: dto.appKey } });
    if (!app) return { success: true };

    await this.events.save(
      this.events.create({
        appId: app.id,
        releaseId: dto.releaseId ?? null,
        artifactId: dto.artifactId ?? null,
        deviceId: dto.deviceId ?? null,
        platform: dto.platform,
        arch: dto.arch ?? null,
        type: dto.type,
        fromVersionCode: dto.fromVersionCode ?? null,
        toVersionCode: dto.toVersionCode ?? null,
        createdAt: Date.now(),
      }),
    );
    return { success: true };
  }

  private findLatest(
    appId: number,
    channel: string,
    platform: string,
    arch: string,
    statuses: number[],
  ): Promise<ReleaseEntity | null> {
    return this.releases
      .createQueryBuilder('r')
      .where('r.appId = :appId', { appId })
      .andWhere('r.channel = :channel', { channel })
      .andWhere('r.status IN (:...statuses)', { statuses })
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

  private async pickArtifact(
    releaseId: number,
    platform: string,
    arch: string,
  ): Promise<ArtifactEntity | null> {
    const rows = await this.artifacts.find({
      where: { releaseId, platform },
    });
    return pickPreferredArtifact(rows, platform, arch);
  }

  private toArtifactSummary(
    artifact: ArtifactEntity,
    req: Request,
    deviceId?: string,
  ): ArtifactSummary {
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
      downloadUrl: this.buildDownloadUrl(req, artifact.id, deviceId),
    };
  }

  private buildDownloadUrl(
    req: Request,
    artifactId: number,
    deviceId?: string,
  ): string {
    const path = `api/v1/updates/download/${artifactId}`;
    const query = deviceId
      ? `?deviceId=${encodeURIComponent(deviceId)}`
      : '';
    if (env.publicBaseUrl) return `${env.publicBaseUrl}/${path}${query}`;

    const proto =
      ((req.headers['x-forwarded-proto'] as string) ?? '')
        .split(',')[0]
        .trim() || req.protocol;
    const host =
      ((req.headers['x-forwarded-host'] as string) ?? '')
        .split(',')[0]
        .trim() || req.headers.host;
    return `${proto}://${host}/${path}${query}`;
  }
}
