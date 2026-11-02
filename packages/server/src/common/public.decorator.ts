import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** 标记接口无需登录（客户端接口、健康检查） */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
