import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import type { Request } from 'express';
import { Public } from '../../common/public.decorator.js';
import { CatalogService } from './catalog.service.js';

class CatalogQueryDto {
  @IsIn(['android', 'darwin', 'win32', 'linux'])
  platform!: string;

  @IsOptional()
  @IsIn(['universal', 'arm64', 'x64'])
  arch?: string;

  @IsOptional()
  @IsIn(['stable', 'beta'])
  channel?: string;
}

@ApiTags('客户端 · 目录')
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get('summary')
  @ApiOperation({ summary: '目录汇总（应用总数与活跃平台数）' })
  summary() {
    return this.catalogService.summary();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: '应用目录（启动器首屏）' })
  list(@Query() query: CatalogQueryDto, @Req() req: Request) {
    return this.catalogService.list(
      query.platform,
      query.arch ?? 'universal',
      query.channel ?? 'stable',
      req,
    );
  }
}
