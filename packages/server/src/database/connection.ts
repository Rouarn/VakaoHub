import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

/**
 * 应用运行时与迁移脚本共用的连接参数。
 * 连接池上限按用途区分，避免两份连接配置在字符集/时区/账号上各自漂移。
 */
export const connectionOptions = {
  type: 'mysql' as const,
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.database,
  charset: 'utf8mb4',
  timezone: '+08:00',
};

/** 迁移文件路径，应用与 CLI 迁移共用 */
export const MIGRATIONS = [join(currentDir, 'migrations/*.js')];

/** 连接池上限：应用运行时 / 迁移脚本 */
export const CONNECTION_LIMITS = {
  app: 10,
  migrate: 5,
} as const;
