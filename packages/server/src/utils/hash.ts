import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/** 流式计算文件 SHA-256，避免大文件驻留内存 */
export function sha256File(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
