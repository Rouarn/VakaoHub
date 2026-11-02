import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import { env } from '../../config/env.js';
import { tmpDir } from '../../utils/paths.js';

/**
 * 产物上传：落盘到临时目录，避免大文件驻留内存；
 * 格式/平台校验与 SHA-256 由 ArtifactsService 负责。
 */
export function ArtifactUploadInterceptor() {
  return FileInterceptor('file', {
    storage: diskStorage({
      destination: (_req, _file, cb) => {
        try {
          const dir = tmpDir();
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        } catch (error) {
          cb(error as Error, '');
        }
      },
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: env.uploadMaxBytes, files: 1 },
  });
}
