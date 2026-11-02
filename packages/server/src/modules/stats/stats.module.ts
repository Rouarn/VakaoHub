import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppEntity } from '../../database/entities/app.entity.js';
import { AuditLogEntity } from '../../database/entities/audit-log.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ClientEventEntity } from '../../database/entities/client-event.entity.js';
import { ReleaseEntity } from '../../database/entities/release.entity.js';
import { StatsController } from './stats.controller.js';
import { StatsService } from './stats.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AppEntity,
      ReleaseEntity,
      ArtifactEntity,
      ClientEventEntity,
      AuditLogEntity,
    ]),
  ],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
