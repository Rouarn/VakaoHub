import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ARCHES, CHANNELS, PLATFORMS } from '@vakao/hub-shared';

export class CheckUpdateQueryDto {
  @IsString()
  @Length(1, 64)
  appKey!: string;

  @IsIn(PLATFORMS as unknown as string[])
  platform!: string;

  @IsOptional()
  @IsIn(ARCHES as unknown as string[])
  arch?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  versionCode!: number;

  @IsOptional()
  @IsIn(CHANNELS as unknown as string[])
  channel?: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  deviceId?: string;

  @IsOptional()
  @IsString()
  @Length(1, 32)
  versionName?: string;
}
