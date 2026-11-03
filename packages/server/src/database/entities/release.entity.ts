import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../transformers.js';
import type { AppEntity } from './app.entity.js';
import type { ArtifactEntity } from './artifact.entity.js';

/** 版本状态：0 草稿 / 1 灰度 / 2 全量 / 3 已下架 */
export const RELEASE_STATUS = {
  DRAFT: 0,
  GRAY: 1,
  PUBLISHED: 2,
  OFFLINE: 3,
} as const;

/**
 * 一次发布。Android 与桌面共用；平台差异体现在 artifacts 上，
 * 因此同一 versionCode 可以在不同平台各有一条记录，也可以一条记录挂多个产物。
 */
@Entity('hub_releases')
@Index(['appId', 'versionCode', 'channel'], { unique: true })
export class ReleaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  appId!: number;

  @Column({ type: 'varchar', length: 32 })
  versionName!: string;

  /** 单调递增的整数版本号，客户端比较基准 */
  @Column({ type: 'int' })
  versionCode!: number;

  @Column({ type: 'varchar', length: 16, default: 'stable' })
  channel!: string;

  @Column({ type: 'int', default: RELEASE_STATUS.DRAFT })
  status!: number;

  /** 灰度百分比 0~100，status=1 时生效 */
  @Column({ type: 'int', default: 0 })
  grayPercent!: number;

  /** 强更开关，可随时修改 */
  @Column({ type: 'int', default: 0 })
  forceUpdate!: number;

  /** 低于该版本号一律按强更处理 */
  @Column({ type: 'int', default: 0 })
  minVersionCode!: number;

  @Column({ type: 'text', nullable: true })
  updateLog!: string | null;

  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  publishedAt!: number | null;

  /** 下架原因：auto 被新版本挤下架 / manual 人工下架 */
  @Column({ type: 'varchar', length: 8, nullable: true })
  offlineReason!: 'auto' | 'manual' | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  updatedAt!: number;

  @ManyToOne('AppEntity', 'releases', { onDelete: 'CASCADE' })
  app!: AppEntity;

  @OneToMany('ArtifactEntity', 'release')
  artifacts?: ArtifactEntity[];
}
