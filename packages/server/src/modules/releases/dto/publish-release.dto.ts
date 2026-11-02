import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PublishReleaseDto {
  @IsIn(['full', 'gray'], { message: 'mode 仅支持 full 或 gray' })
  mode!: 'full' | 'gray';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  grayPercent?: number;
}
