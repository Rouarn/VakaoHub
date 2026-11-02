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
  EVENT_TYPES,
  PLATFORMS,
} from '@vakao/hub-shared';

export class ReportEventDto {
  @IsString()
  @Length(1, 64)
  appKey!: string;

  @IsIn(PLATFORMS as unknown as string[])
  platform!: string;

  @IsOptional()
  @IsIn(ARCHES as unknown as string[])
  arch?: string;

  @IsIn(EVENT_TYPES as unknown as string[])
  type!: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  deviceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  releaseId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  artifactId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  fromVersionCode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  toVersionCode?: number;
}
