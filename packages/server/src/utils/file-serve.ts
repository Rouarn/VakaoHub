import type { Request, Response } from 'express';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { basename } from 'node:path';

const MIME_BY_EXT: Record<string, string> = {
  apk: 'application/vnd.android.package-archive',
  dmg: 'application/x-apple-diskimage',
  msi: 'application/x-msi',
  exe: 'application/vnd.microsoft.portable-executable',
  zip: 'application/zip',
  appimage: 'application/x-executable',
  deb: 'application/vnd.debian.binary-package',
};

export function mimeByFileName(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

export interface RangeParts {
  start: number;
  end: number;
}

/** 解析单区间 Range；非法或多区间返回 null（调用方回 416） */
export function parseRange(header: string, size: number): RangeParts | null {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;

  let start: number;
  let end: number;
  if (match[1] === '') {
    const suffix = Number(match[2]);
    if (!Number.isFinite(suffix) || suffix <= 0 || size === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1);
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (size === 0 || start >= size || start > end) return null;
  return { start, end };
}

/**
 * 下载产物：支持 HTTP Range、强 ETag 与断点续传。
 * 返回值表示本次是否真正发送了文件内容（304/416 返回 false），
 * 供调用方只在真实下载时计数。
 */
export async function serveFile(
  fullPath: string,
  req: Request,
  res: Response,
  options: { fileName: string; etag: string; cacheControl?: string },
): Promise<boolean> {
  const info = await stat(fullPath);
  const size = info.size;
  const etag = `"${options.etag}"`;

  res.setHeader('ETag', etag);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeByFileName(options.fileName));
  res.setHeader(
    'Cache-Control',
    options.cacheControl ?? 'public, max-age=31536000, immutable',
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(basename(options.fileName))}`,
  );

  if (req.headers['if-none-match'] === etag) {
    res.status(304).end();
    return false;
  }

  const rangeHeader = req.headers.range;
  const ifRange = req.headers['if-range'];
  const rangeUsable = Boolean(rangeHeader) && (!ifRange || ifRange === etag);

  if (rangeHeader && rangeUsable) {
    const parsed = parseRange(rangeHeader, size);
    if (!parsed) {
      res.status(416).setHeader('Content-Range', `bytes */${size}`).end();
      return false;
    }
    res.status(206);
    res.setHeader(
      'Content-Range',
      `bytes ${parsed.start}-${parsed.end}/${size}`,
    );
    res.setHeader('Content-Length', String(parsed.end - parsed.start + 1));
    streamToResponse(
      createReadStream(fullPath, { start: parsed.start, end: parsed.end }),
      req,
      res,
    );
    return true;
  }

  res.setHeader('Content-Length', String(size));
  streamToResponse(createReadStream(fullPath), req, res);
  return true;
}

/** 将文件流写入响应，并保证读错误不会变成未捕获异常导致进程退出 */
function streamToResponse(
  stream: ReturnType<typeof createReadStream>,
  req: Request,
  res: Response,
): void {
  const destroy = (): void => {
    if (!stream.destroyed) stream.destroy();
  };

  // 客户端提前断开时释放文件句柄
  res.on('close', destroy);
  req.on('aborted', destroy);
  stream.on('error', (error) => {
    if (!res.headersSent) {
      res.status(500).end();
      return;
    }
    // 已开始传输，只能中断连接，避免错误处理器继续写响应
    res.destroy(error);
  });
  stream.pipe(res);
}
