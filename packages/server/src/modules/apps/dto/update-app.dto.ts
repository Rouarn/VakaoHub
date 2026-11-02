import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateAppDto {
  @IsOptional()
  @IsString()
  @Length(1, 128)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  description?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  iconUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 32)
  category?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Length(0, 255)
  repoUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @Length(0, 255)
  homepage?: string;
}
