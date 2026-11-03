import 'dotenv/config';
import { DataSource } from 'typeorm';
import { env } from '../config/env.js';
import {
  CONNECTION_LIMITS,
  connectionOptions,
  MIGRATIONS,
} from './connection.js';
import { ENTITIES } from './entities/index.js';

/**
 * 迁移专用 DataSource。
 *
 * 应用运行时使用 DatabaseModule（开发可 synchronize，生产走迁移）；
 * 本文件只给 `scripts/migrate.mjs` / `migrate:revert` 使用，始终 synchronize=false。
 * 连接参数与迁移路径来自 connection.ts，避免与 DatabaseModule 出现两份配置。
 */
export const AppDataSource = new DataSource({
  ...connectionOptions,
  entities: ENTITIES,
  migrations: MIGRATIONS,
  synchronize: false,
  migrationsRun: false,
  logging: env.db.logging,
  extra: { connectionLimit: CONNECTION_LIMITS.migrate },
});
