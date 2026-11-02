import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../transformers.js';

/** 客户端上报的检查/下载/安装/启动事件，用于漏斗与统计 */
@Entity('hub_events')
@Index(['appId', 'createdAt'])
export class ClientEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  appId!: number;

  @Column({ type: 'int', nullable: true })
  releaseId!: number | null;

  @Column({ type: 'int', nullable: true })
  artifactId!: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  deviceId!: string | null;

  @Column({ type: 'varchar', length: 16 })
  platform!: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  arch!: string | null;

  @Column({ type: 'varchar', length: 32 })
  type!: string;

  @Column({ type: 'int', nullable: true })
  fromVersionCode!: number | null;

  @Column({ type: 'int', nullable: true })
  toVersionCode!: number | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;
}
