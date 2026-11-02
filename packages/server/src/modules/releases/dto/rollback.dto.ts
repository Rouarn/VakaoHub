import { IsIn, IsOptional } from 'class-validator';

export class RollbackDto {
  @IsOptional()
  @IsIn(['stable', 'beta'])
  channel?: 'stable' | 'beta';
}
