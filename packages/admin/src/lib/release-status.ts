import { RELEASE_STATUS } from '@vakao/hub-shared';
import type { ReleaseStatus } from '@vakao/hub-shared';

/** 版本状态文案与颜色，全 admin 唯一来源 */
export const STATUS_LABEL: Record<ReleaseStatus, string> = {
  [RELEASE_STATUS.DRAFT]: '草稿',
  [RELEASE_STATUS.GRAY]: '灰度',
  [RELEASE_STATUS.PUBLISHED]: '全量',
  [RELEASE_STATUS.OFFLINE]: '已下架',
};

export type StatusTagType = 'default' | 'warning' | 'success' | 'error';

export const STATUS_TAG_TYPE: Record<ReleaseStatus, StatusTagType> = {
  [RELEASE_STATUS.DRAFT]: 'default',
  [RELEASE_STATUS.GRAY]: 'warning',
  [RELEASE_STATUS.PUBLISHED]: 'success',
  [RELEASE_STATUS.OFFLINE]: 'error',
};
