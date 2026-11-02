import {
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
} from 'class-validator';

export class CreateAppDto {
  @IsString()
  @Length(1, 64)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, {
    message: 'appKey 仅允许字母、数字、下划线与短横线，且不能以符号开头',
  })
  appKey!: string;

  @IsString()
  @Length(1, 128)
  name!: string;

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
