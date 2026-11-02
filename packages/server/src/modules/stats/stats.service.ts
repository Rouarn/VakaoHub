import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Paginated } from '@vakao/hub-shared';
import { AppEntity } from '../../database/entities/app.entity.js';
import { AuditLogEntity } from '../../database/entities/audit-log.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ClientEventEntity } from '../../database/entities/client-event.entity.js';
import { ReleaseEntity } from '../../database/entities/release.entity.js';

@Injectable()
export class StatsService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
    @InjectRepository(ReleaseEntity)
    private readonly releases: Repository<ReleaseEntity>,
    @InjectRepository(ArtifactEntity)
    private readonly artifacts: Repository<ArtifactEntity>,
    @InjectRepository(ClientEventEntity)
    private readonly events: Repository<ClientEventEntity>,
    @InjectRepository(AuditLogEntity)
    private readonly auditLogs: Repository<AuditLogEntity>,
  ) {}

  async overview() {
    const [appCount, releaseCount, artifactCount, eventCount] =
      await Promise.all([
        this.apps.count(),
        this.releases.count(),
        this.artifacts.count(),
        this.events.count(),
      ]);

    const totals = await this.artifacts
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.size), 0)', 'bytes')
      .addSelect('COALESCE(SUM(a.downloadCount), 0)', 'downloads')
      .getRawOne<{ bytes: string | number; downloads: string | number }>();

    const since = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentByType = await this.events
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('e.createdAt >= :since', { since })
      .groupBy('e.type')
      .orderBy('count', 'DESC')
      .getRawMany<{ type: string; count: string | number }>();

    const latestReleases = await this.releases.find({
      order: { createdAt: 'DESC' },
      take: 5,
      relations: { app: true },
    });

    return {
      counts: {
        apps: appCount,
        releases: releaseCount,
        artifacts: artifactCount,
        events: eventCount,
      },
      storageBytes: Number(totals?.bytes ?? 0),
      downloads: Number(totals?.downloads ?? 0),
      eventsLast7Days: recentByType.map((row) => ({
        type: row.type,
        count: Number(row.count),
      })),
      latestReleases: latestReleases.map((release) => ({
        id: release.id,
        appKey: release.app?.appKey ?? '',
        appName: release.app?.name ?? '',
        versionName: release.versionName,
        versionCode: release.versionCode,
        status: release.status,
        createdAt: release.createdAt,
      })),
    };
  }

  /** 最近 30 天事件漏斗（检查 → 下载 → 安装） */
  async listAuditLogs(query: {
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<AuditLogEntity>> {
    const page = query.page ?? 1;
    const size = query.pageSize ?? 20;
    const [records, total] = await this.auditLogs.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * size,
      take: size,
    });
    return {
      records,
      total,
      totalPages: Math.ceil(total / size) || 1,
      current: page,
      size,
    };
  }

  async funnel(appId?: number) {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const query = this.events
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('e.createdAt >= :since', { since });

    if (appId) query.andWhere('e.appId = :appId', { appId });

    const rows = await query
      .groupBy('e.type')
      .getRawMany<{ type: string; count: string | number }>();

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.type] = Number(row.count);
    }

    const downloadStart = counts.download_start ?? 0;
    const downloadSuccess = counts.download_success ?? 0;
    const installSuccess = counts.install_success ?? 0;
    const rate = (numerator: number, denominator: number): number =>
      denominator > 0 ? Math.round((numerator / denominator) * 1000) / 10 : 0;

    return {
      since,
      appId: appId ?? null,
      counts,
      rates: {
        download: rate(downloadSuccess, downloadStart),
        install: rate(installSuccess, downloadSuccess),
      },
    };
  }

  async listEvents(query: {
    page?: number;
    pageSize?: number;
    appId?: number;
    type?: string;
  }): Promise<Paginated<ClientEventEntity>> {
    const page = query.page ?? 1;
    const size = query.pageSize ?? 20;
    const qb = this.events.createQueryBuilder('e');
    if (query.appId) qb.andWhere('e.appId = :appId', { appId: query.appId });
    if (query.type) qb.andWhere('e.type = :type', { type: query.type });

    const [records, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      records,
      total,
      totalPages: Math.ceil(total / size) || 1,
      current: page,
      size,
    };
  }
}
