import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { StatsService } from './stats.service.js';

class ListEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  appId?: number;

  @IsOptional()
  @IsString()
  @IsIn([
    'check',
    'download_start',
    'download_success',
    'download_fail',
    'verify_fail',
    'install_success',
    'install_fail',
    'launch',
    'open',
    'quit',
  ])
  type?: string;
}

class FunnelQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  appId?: number;
}

@ApiTags('管理端 · 统计')
@Controller('admin')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('stats')
  @ApiOperation({ summary: '总览统计' })
  overview() {
    return this.statsService.overview();
  }

  @Get('stats/funnel')
  @ApiOperation({ summary: '最近 30 天事件漏斗' })
  funnel(@Query() query: FunnelQueryDto) {
    return this.statsService.funnel(query.appId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: '管理端操作审计' })
  auditLogs(@Query() query: ListEventsQueryDto) {
    return this.statsService.listAuditLogs({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('events')
  @ApiOperation({ summary: '事件列表' })
  events(@Query() query: ListEventsQueryDto) {
    return this.statsService.listEvents(query);
  }
}
