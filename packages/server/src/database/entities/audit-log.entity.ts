import {
  Column,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { bigintTransformer } from '../transformers.js';

/** 管理端操作审计：只记录写操作与登录，不记录请求体 */
@Entity('hub_audit_logs')
@Index(['createdAt'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  username!: string | null;

  @Column({ type: 'varchar', length: 8 })
  method!: string;

  @Column({ type: 'varchar', length: 255 })
  path!: string;

  @Column({ type: 'int' })
  statusCode!: number;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ip!: string | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;
}
