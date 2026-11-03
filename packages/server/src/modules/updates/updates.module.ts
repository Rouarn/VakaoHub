import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ClientEventEntity } from '../../database/entities/client-event.entity.js';
import { ReleaseEntity } from '../../database/entities/release.entity.js';
import { UpdatesController } from './updates.controller.js';
import { UpdatesService } from './updates.service.js';
import { EventRetentionService } from './event-retention.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppEntity,
      ReleaseEntity,
      ArtifactEntity,
      ClientEventEntity,
    ]),
  ],
  controllers: [UpdatesController],
  providers: [UpdatesService, EventRetentionService],
})
export class UpdatesModule {}
