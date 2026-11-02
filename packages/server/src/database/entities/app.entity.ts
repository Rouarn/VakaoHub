import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../transformers.js';
import type { ReleaseEntity } from './release.entity.js';

/** 一个可分发软件（VaKao 系产品或外部项目） */
@Entity('hub_apps')
export class AppEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  /** 稳定标识，客户端与 URL 使用，如 wiredeck */
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  appKey!: string;

  @Column({ type: 'varchar', length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  iconUrl!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  repoUrl!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  homepage!: string | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  updatedAt!: number;

  @OneToMany('ReleaseEntity', 'app')
  releases?: ReleaseEntity[];
}
