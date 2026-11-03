import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { rm } from 'node:fs/promises';
import { Repository } from 'typeorm';
import type { Paginated } from '@vakao/hub-shared';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import {
  RELEASE_STATUS,
  ReleaseEntity,
} from '../../database/entities/release.entity.js';
import { dirname } from 'node:path';
import { pruneEmptyDir, resolveStoragePath } from '../../utils/paths.js';
import type { CreateReleaseDto } from './dto/create-release.dto.js';
import type { ListReleasesQueryDto } from './dto/list-releases-query.dto.js';
import type { PublishReleaseDto } from './dto/publish-release.dto.js';
import type { UpdateReleaseDto } from './dto/update-release.dto.js';

@Injectable()
export class ReleasesService {
  constructor(
    @InjectRepository(ReleaseEntity)
    private readonly releases: Repository<ReleaseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
  ) {}

  async list(query: ListReleasesQueryDto): Promise<Paginated<ReleaseEntity>> {
    const page = query.page ?? 1;
    const size = query.pageSize ?? 20;
    const qb = this.releases
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.artifacts', 'artifact')
      .orderBy('r.versionCode', 'DESC')
      .addOrderBy('artifact.id', 'ASC');

    if (query.appId) qb.andWhere('r.appId = :appId', { appId: query.appId });
    if (query.status !== undefined) {
      qb.andWhere('r.status = :status', { status: query.status });
    }

    const [records, total] = await qb
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

  async getDetail(id: number): Promise<ReleaseEntity> {
    const record = await this.releases.findOne({
      where: { id },
      relations: { artifacts: true, app: true },
    });
    if (!record) throw new NotFoundException('版本不存在');
    return record;
  }

  async create(dto: CreateReleaseDto): Promise<ReleaseEntity> {
    const app = await this.apps.findOne({ where: { id: dto.appId } });
    if (!app) throw new NotFoundException('应用不存在');

    const channel = dto.channel ?? 'stable';
    if (dto.minVersionCode !== undefined && dto.minVersionCode > dto.versionCode) {
      throw new BadRequestException('minVersionCode 不能大于 versionCode');
    }

    const exists = await this.releases.findOne({
      where: { appId: dto.appId, versionCode: dto.versionCode, channel },
    });
    if (exists) throw new ConflictException('该渠道下 versionCode 已存在');

    const now = Date.now();
    return this.releases.save(
      this.releases.create({
        appId: dto.appId,
        versionName: dto.versionName,
        versionCode: dto.versionCode,
        channel,
        status: RELEASE_STATUS.DRAFT,
        grayPercent: 0,
        forceUpdate: 0,
        minVersionCode: dto.minVersionCode ?? 0,
        updateLog: dto.updateLog ?? null,
        publishedAt: null,
        offlineReason: null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async update(id: number, dto: UpdateReleaseDto): Promise<ReleaseEntity> {
    const record = await this.getDetail(id);
    if (
      record.status === RELEASE_STATUS.GRAY ||
      record.status === RELEASE_STATUS.PUBLISHED
    ) {
      throw new BadRequestException('发布中的版本不可编辑，请先下架');
    }
    if (dto.versionName !== undefined) record.versionName = dto.versionName;
    if (dto.updateLog !== undefined) record.updateLog = dto.updateLog;
    if (dto.minVersionCode !== undefined) {
      if (dto.minVersionCode > record.versionCode) {
        throw new BadRequestException('minVersionCode 不能大于 versionCode');
      }
      record.minVersionCode = dto.minVersionCode;
    }
    record.updatedAt = Date.now();
    return this.releases.save(record);
  }

  async publish(id: number, dto: PublishReleaseDto): Promise<ReleaseEntity> {
    if (dto.mode === 'gray' && !dto.grayPercent) {
      throw new BadRequestException('灰度发布必须提供 grayPercent（1~99）');
    }

    return this.releases.manager.transaction(async (manager) => {
      const record = await manager.findOne(ReleaseEntity, {
        where: { id },
        relations: { artifacts: true },
      });
      if (!record) throw new NotFoundException('版本不存在');
      if (record.status === RELEASE_STATUS.PUBLISHED) {
        throw new ConflictException('该版本已全量发布');
      }
      if (!record.artifacts?.length) {
        throw new BadRequestException('请先上传至少一个产物再发布');
      }

      const row = await manager
        .createQueryBuilder(ReleaseEntity, 'r')
        .select('MAX(r.versionCode)', 'max')
        .where('r.appId = :appId', { appId: record.appId })
        .andWhere('r.channel = :channel', { channel: record.channel })
        .andWhere('r.status = :status', { status: RELEASE_STATUS.PUBLISHED })
        .andWhere('r.id != :id', { id: record.id })
        .getRawOne<{ max: number | string | null }>();

      const maxFull = row?.max == null ? null : Number(row.max);
      if (maxFull !== null && record.versionCode <= maxFull) {
        throw new ConflictException(
          `发布门禁：versionCode ${record.versionCode} 必须大于当前全量版本 ${maxFull}`,
        );
      }

      if (dto.mode === 'full') {
        await manager.update(
          ReleaseEntity,
          {
            appId: record.appId,
            channel: record.channel,
            status: RELEASE_STATUS.PUBLISHED,
          },
          {
            status: RELEASE_STATUS.OFFLINE,
            offlineReason: 'auto',
            updatedAt: Date.now(),
          },
        );
      }

      record.status =
        dto.mode === 'gray' ? RELEASE_STATUS.GRAY : RELEASE_STATUS.PUBLISHED;
      record.grayPercent = dto.mode === 'gray' ? (dto.grayPercent ?? 0) : 0;
      record.offlineReason = null;
      record.publishedAt = Date.now();
      record.updatedAt = Date.now();
      return manager.save(record);
    });
  }

  /** 回滚到上一个被自动挤下架的全量版本 */
  async rollbackApp(appId: number, channel = 'stable'): Promise<ReleaseEntity> {
    return this.releases.manager.transaction(async (manager) => {
      const current = await manager.findOne(ReleaseEntity, {
        where: { appId, channel, status: RELEASE_STATUS.PUBLISHED },
        order: { versionCode: 'DESC' },
      });
      if (!current) {
        throw new BadRequestException('当前没有全量版本可回滚');
      }

      const target = await manager.findOne(ReleaseEntity, {
        where: {
          appId,
          channel,
          status: RELEASE_STATUS.OFFLINE,
          offlineReason: 'auto',
        },
        order: { versionCode: 'DESC' },
      });
      if (!target || target.versionCode >= current.versionCode) {
        throw new BadRequestException('没有可回滚的历史全量版本');
      }

      const artifacts = await manager.count(ArtifactEntity, {
        where: { releaseId: target.id },
      });
      if (artifacts === 0) {
        throw new BadRequestException('目标版本没有产物，无法回滚');
      }

      current.status = RELEASE_STATUS.OFFLINE;
      current.offlineReason = 'manual';
      current.grayPercent = 0;
      current.updatedAt = Date.now();

      target.status = RELEASE_STATUS.PUBLISHED;
      target.offlineReason = null;
      target.grayPercent = 0;
      target.publishedAt = Date.now();
      target.updatedAt = Date.now();

      await manager.save([current, target]);
      return target;
    });
  }

  async offline(id: number): Promise<ReleaseEntity> {
    const record = await this.getDetail(id);
    if (
      record.status !== RELEASE_STATUS.GRAY &&
      record.status !== RELEASE_STATUS.PUBLISHED
    ) {
      throw new BadRequestException('只有灰度或全量版本可以下架');
    }
    record.status = RELEASE_STATUS.OFFLINE;
    record.offlineReason = 'manual';
    record.grayPercent = 0;
    record.updatedAt = Date.now();
    return this.releases.save(record);
  }

  async setForce(id: number, enabled: boolean): Promise<ReleaseEntity> {
    const record = await this.getDetail(id);
    record.forceUpdate = enabled ? 1 : 0;
    record.updatedAt = Date.now();
    return this.releases.save(record);
  }

  async remove(id: number): Promise<{ success: true }> {
    const record = await this.getDetail(id);
    if (
      record.status === RELEASE_STATUS.GRAY ||
      record.status === RELEASE_STATUS.PUBLISHED
    ) {
      throw new BadRequestException('发布中的版本不可删除，请先下架');
    }

    for (const artifact of record.artifacts ?? []) {
      const filePath = resolveStoragePath(artifact.relPath);
      await rm(filePath, { force: true });
      await pruneEmptyDir(dirname(filePath));
    }
    await this.releases.remove(record);
    return { success: true };
  }
}
