import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppsService } from './apps.service.js';
import { CreateAppDto } from './dto/create-app.dto.js';
import { UpdateAppDto } from './dto/update-app.dto.js';

@ApiTags('管理端 · 应用')
@Controller('admin/apps')
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Get()
  @ApiOperation({ summary: '应用列表' })
  list() {
    return this.appsService.list();
  }

  @Post()
  @ApiOperation({ summary: '创建应用' })
  create(@Body() dto: CreateAppDto) {
    return this.appsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新应用' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppDto,
  ) {
    return this.appsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除应用（含版本、产物与磁盘文件）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.appsService.remove(id);
  }
}
