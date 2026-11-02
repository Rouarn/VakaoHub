import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { bigintTransformer } from '../transformers.js';

/** 管理端账号（单角色：admin） */
@Entity('hub_admin_users')
export class AdminUserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  username!: string;

  @Column({ type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  displayName!: string | null;

  /** 令牌版本：改密 +1，旧 JWT 立即失效 */
  @Column({ type: 'int', default: 0 })
  tokenVersion!: number;

  /** 连续登录失败次数 */
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  /** 锁定截止时间（毫秒） */
  @Column({ type: 'bigint', nullable: true, transformer: bigintTransformer })
  lockedUntil!: number | null;

  @Column({ type: 'bigint', transformer: bigintTransformer })
  createdAt!: number;
}
