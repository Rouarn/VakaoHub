import { mkdir } from 'node:fs/promises';
import { join, normalize, resolve, sep } from 'node:path';
import { env } from '../config/env.js';

/** 确保存储根与临时目录存在 */
export async function ensureStorage(): Promise<void> {
  await mkdir(env.storageDir, { recursive: true });
  await mkdir(join(env.storageDir, '.tmp'), { recursive: true });
}

/** 临时上传目录 */
export function tmpDir(): string {
  return join(env.storageDir, '.tmp');
}

/**
 * 把相对路径解析为存储根下的绝对路径，并阻止 ../ 逃逸。
 */
export function resolveStoragePath(relPath: string): string {
  const root = resolve(env.storageDir);
  const target = resolve(root, normalize(relPath));
  if (target !== root && !target.startsWith(root + sep)) {
    throw new Error('非法的存储路径');
  }
  return target;
}

/** 生成安全文件名：只保留字母数字、点、下划线、短横线 */
export function safeFileName(name: string): string {
  const base = name.replace(/\\/g, '/').split('/').pop() ?? 'file';
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_');
  return cleaned.slice(0, 200) || 'file';
}
