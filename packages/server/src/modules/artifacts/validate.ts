import { open, stat } from 'node:fs/promises';

/** 各格式的文件头/文件尾魔数校验，防止改扩展名上传任意文件 */
export function matchesMagic(
  format: string,
  head: Buffer,
  tail: Buffer,
): boolean {
  const startsWith = (signature: number[]): boolean =>
    head.length >= signature.length &&
    signature.every((byte, index) => head[index] === byte);

  switch (format) {
    case 'apk':
    case 'zip':
      return (
        startsWith([0x50, 0x4b, 0x03, 0x04]) ||
        startsWith([0x50, 0x4b, 0x05, 0x06])
      );
    case 'msi':
      return startsWith([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case 'exe':
      return startsWith([0x4d, 0x5a]);
    case 'appimage':
      return startsWith([0x7f, 0x45, 0x4c, 0x46]);
    case 'deb':
      return head.subarray(0, 8).toString('latin1') === '!<arch>\n';
    case 'dmg':
      // UDIF 镜像末尾固定带 koly 尾块
      return tail.includes(Buffer.from('koly', 'latin1'));
    default:
      return false;
  }
}

/** 读取文件首尾并校验魔数 */
export async function validateArtifactFile(
  filePath: string,
  format: string,
): Promise<boolean> {
  const info = await stat(filePath);
  const handle = await open(filePath, 'r');
  try {
    const headLength = Math.min(16, info.size);
    const tailLength = Math.min(512, info.size);
    const head = Buffer.alloc(headLength);
    const tail = Buffer.alloc(tailLength);

    if (headLength > 0) {
      await handle.read(head, 0, headLength, 0);
    }
    if (tailLength > 0) {
      await handle.read(tail, 0, tailLength, info.size - tailLength);
    }
    return matchesMagic(format, head, tail);
  } finally {
    await handle.close();
  }
}
