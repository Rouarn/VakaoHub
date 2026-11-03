import { IsOptional, IsString, Length } from 'class-validator';

/** 下载产物的查询参数；灰度版本的下载链接会带上 deviceId 供服务端校验灰度桶。 */
export class DownloadArtifactQueryDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  deviceId?: string;
}
