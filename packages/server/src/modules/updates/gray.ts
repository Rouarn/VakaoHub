import { createHash } from 'node:crypto';

/**
 * 灰度命中：sha256(deviceId) 前 8 位十六进制取模 100。
 * 同一设备结果稳定；公式上线后不可更改，否则已灰度设备会重新分桶。
 */
export function grayHit(
  deviceId: string | undefined,
  grayPercent: number,
): boolean {
  if (grayPercent >= 100) return true;
  if (!deviceId || grayPercent <= 0) return false;
  const bucket =
    parseInt(
      createHash('sha256').update(deviceId).digest('hex').slice(0, 8),
      16,
    ) % 100;
  return bucket < grayPercent;
}
