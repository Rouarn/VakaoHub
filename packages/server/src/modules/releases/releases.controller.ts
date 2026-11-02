import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReleaseDto } from './dto/create-release.dto.js';
import { ForceReleaseDto } from './dto/list-releases-query.dto.js';
import { ListReleasesQueryDto } from './dto/list-releases-query.dto.js';
import { PublishReleaseDto } from './dto/publish-release.dto.js';
import { RollbackDto } from './dto/rollback.dto.js';
import { UpdateReleaseDto } from './dto/update-release.dto.js';
import { ReleasesService } from './releases.service.js';

@ApiTags('管理端 · 版本')
@Controller('admin/releases')
export class ReleasesController {
  constructor(private readonly releasesService: ReleasesService) {}

  @Get()
  @ApiOperation({ summary: '版本列表' })
  list(@Query() query: ListReleasesQueryDto) {
    return this.releasesService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '版本详情（含产物）' })
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.releasesService.getDetail(id);
  }

  @Post()
  @ApiOperation({ summary: '创建草稿版本' })
  create(@Body() dto: CreateReleaseDto) {
    return this.releasesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '编辑草稿/已下架版本' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReleaseDto,
  ) {
    return this.releasesService.update(id, dto);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '发布（全量/灰度）' })
  publish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PublishReleaseDto,
  ) {
    return this.releasesService.publish(id, dto);
  }

  @Post('rollback/:appId')
  @ApiOperation({ summary: '回滚到上一个全量版本' })
  rollback(
    @Param('appId', ParseIntPipe) appId: number,
    @Body() dto: RollbackDto,
  ) {
    return this.releasesService.rollbackApp(appId, dto.channel ?? 'stable');
  }

  @Post(':id/offline')
  @ApiOperation({ summary: '下架' })
  offline(@Param('id', ParseIntPipe) id: number) {
    return this.releasesService.offline(id);
  }

  @Post(':id/force')
  @ApiOperation({ summary: '切换强更开关' })
  force(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ForceReleaseDto,
  ) {
    return this.releasesService.setForce(id, dto.enabled);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除草稿/已下架版本（含产物文件）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.releasesService.remove(id);
  }
}
