import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateReleaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  appId!: number;

  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'versionName 仅允许字母、数字与 . _ -',
  })
  versionName!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  versionCode!: number;

  @IsOptional()
  @IsIn(['stable', 'beta'])
  channel?: 'stable' | 'beta';

  @IsOptional()
  @IsString()
  @Length(0, 5000)
  updateLog?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minVersionCode?: number;
}
