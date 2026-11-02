import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity.js';
import { AppsController } from './apps.controller.js';
import { AppsService } from './apps.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AppEntity])],
  controllers: [AppsController],
  providers: [AppsService],
  exports: [AppsService],
})
export class AppsModule {}
