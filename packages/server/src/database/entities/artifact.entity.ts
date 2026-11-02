import {
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../transformers.js';
import type { ReleaseEntity } from './release.entity.js';

/**
 * 发布产物：一个版本下可以有多份文件。
 * Android: platform=android, format=apk
 * macOS:   platform=darwin,  format=dmg, arch=arm64|x64|universal
 * Windows: platform=win32,   format=msi|exe|zip
 */
@Entity('hub_artifacts')
@Index(['releaseId', 'platform', 'arch', 'format'], { unique: true })
export class ArtifactEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  releaseId!: number;

  @Column({ type: 'varchar', length: 16 })
  platform!: string;

  @Column({ type: 'varchar', length: 16, default: 'universal' })
  arch!: string;

  @Column({ type: 'varchar', length: 16 })
  format!: string;

  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  /** 相对 STORAGE_DIR 的路径 */
  @Column({ type: 'varchar', length: 512 })
  relPath!: string;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  size!: number;

  @Column({ type: 'varchar', length: 64 })
  sha256!: string;

  /** 最低系统版本，如 12.0 / 10 */
  @Column({ type: 'varchar', length: 16, nullable: true })
  minOs!: string | null;

  /** 代码签名信息（macOS notarized / Windows Authenticode），v1 仅记录 */
  @Column({ type: 'varchar', length: 255, nullable: true })
  signature!: string | null;

  @Column({ type: 'int', default: 0 })
  notarized!: number;

  @Column({ type: 'int', default: 0 })
  downloadCount!: number;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;

  @ManyToOne('ReleaseEntity', 'artifacts', { onDelete: 'CASCADE' })
  release!: ReleaseEntity;
}
