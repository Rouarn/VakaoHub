import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateReleaseDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
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
