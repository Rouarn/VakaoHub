import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/public.decorator.js';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: '健康检查（含数据库连通性）' })
  async check() {
    await this.dataSource.query('SELECT 1');
    return {
      status: 'ok',
      db: 'up',
      time: new Date().toISOString(),
      version: '0.1.0',
    };
  }
}
