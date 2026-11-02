import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ReleaseEntity } from '../../database/entities/release.entity.js';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppEntity, ReleaseEntity, ArtifactEntity])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
