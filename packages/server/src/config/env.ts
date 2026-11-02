/**
 * 环境配置：唯一事实源。
 *
 * 只做「读取 + 类型转换 + 必要校验」，默认值集中在此，
 * 其它模块一律从这里取配置，不再直接读 process.env。
 */
import 'dotenv/config';
import { resolve } from 'node:path';

function toInt(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function toList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret =
  process.env.JWT_SECRET ?? (isProduction ? '' : 'vakao-hub-dev-secret-change-me');

if (!jwtSecret) {
  throw new Error('JWT_SECRET 必须配置');
}

if (isProduction && !process.env.ADMIN_PASSWORD) {
  throw new Error('生产环境必须显式配置 ADMIN_PASSWORD');
}

const corsOrigins = toList(process.env.CORS_ORIGINS);

export const env = {
  nodeEnv,
  isProduction,
  port: toInt(process.env.PORT, 3000),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? '').replace(/\/+$/, ''),
  corsOrigins: corsOrigins.length
    ? corsOrigins
    : [
        'http://localhost:5180',
        'http://127.0.0.1:5180',
        'http://localhost:5200',
        'http://127.0.0.1:5200',
      ],

  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  },

  admin: {
    username: process.env.ADMIN_USERNAME ?? 'admin',
    password: process.env.ADMIN_PASSWORD ?? 'admin123456',
  },

  db: {
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: toInt(process.env.DB_PORT, 3306),
    username: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'vakao_hub',
    synchronize: toBool(process.env.DB_SYNCHRONIZE, !isProduction),
    migrationsRun: toBool(process.env.DB_MIGRATIONS_RUN, false),
    logging: toBool(process.env.DB_LOGGING, false),
  },

  storageDir: resolve(process.cwd(), process.env.STORAGE_DIR ?? 'storage'),
  uploadMaxBytes: toInt(process.env.UPLOAD_MAX_BYTES, 2 * 1024 * 1024 * 1024),
} as const;

export type AppEnv = typeof env;

// 生产环境硬校验：避免把开发期行为带上线
if (isProduction) {
  if (!process.env.JWT_SECRET || env.jwt.secret.length < 32) {
    throw new Error('生产环境 JWT_SECRET 必须显式配置且至少 32 字符');
  }
  if (env.db.synchronize) {
    throw new Error('生产环境 DB_SYNCHRONIZE 必须为 false，结构变更请使用迁移');
  }
  if (env.admin.password.length < 8) {
    throw new Error('生产环境 ADMIN_PASSWORD 至少 8 位');
  }
}
