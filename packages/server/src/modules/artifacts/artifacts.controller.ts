import {
  Body,
  Controller,
  Delete,
  Param,
  ParseIntPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArtifactsService } from './artifacts.service.js';
import { UploadArtifactDto } from './dto/upload-artifact.dto.js';
import { ArtifactUploadInterceptor } from './upload.interceptor.js';

@ApiTags('管理端 · 产物')
@Controller('admin/artifacts')
export class ArtifactsController {
  constructor(private readonly artifactsService: ArtifactsService) {}

  @Post()
  @UseInterceptors(ArtifactUploadInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传产物（APK/DMG/MSI/ZIP/...）' })
  upload(
    @Body() dto: UploadArtifactDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.artifactsService.upload(dto, file);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除产物（含磁盘文件）' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.artifactsService.remove(id);
  }
}
