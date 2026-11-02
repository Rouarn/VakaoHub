import 'dotenv/config';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DataSource } from 'typeorm';
import { env } from '../config/env.js';
import { ENTITIES } from './entities/index.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * 迁移专用 DataSource。
 *
 * 应用运行时使用 DatabaseModule（开发可 synchronize，生产走迁移）；
 * 本文件只给 `scripts/migrate.mjs` / `migrate:revert` 使用，始终 synchronize=false。
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  entities: ENTITIES,
  migrations: [join(currentDir, 'migrations/*.js')],
  synchronize: false,
  migrationsRun: false,
  logging: env.db.logging,
  charset: 'utf8mb4',
  timezone: '+08:00',
  extra: { connectionLimit: 5 },
});
