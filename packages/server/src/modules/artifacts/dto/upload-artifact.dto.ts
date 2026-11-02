import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import {
  ARCHES,
  ARTIFACT_FORMATS,
  PLATFORMS,
} from '@vakao/hub-shared';

export class UploadArtifactDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  releaseId!: number;

  @IsIn(PLATFORMS as unknown as string[])
  platform!: string;

  @IsIn(ARCHES as unknown as string[])
  arch!: string;

  @IsIn(ARTIFACT_FORMATS as unknown as string[])
  format!: string;

  @IsOptional()
  @IsString()
  @Length(0, 16)
  minOs?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  signature?: string;

  /** multipart 表单字段是字符串，这里保持字符串，由 Service 解析 */
  @IsOptional()
  @IsString()
  notarized?: string;
}
