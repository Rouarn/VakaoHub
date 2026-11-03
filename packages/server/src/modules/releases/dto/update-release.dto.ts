import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, {
    message: 'versionName 仅允许字母、数字与 . _ -',
  })
  versionName?: string;

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
