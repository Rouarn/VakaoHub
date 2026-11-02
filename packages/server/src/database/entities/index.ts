import { AdminUserEntity } from './admin-user.entity.js';
import { AppEntity } from './app.entity.js';
import { ArtifactEntity } from './artifact.entity.js';
import { AuditLogEntity } from './audit-log.entity.js';
import { ClientEventEntity } from './client-event.entity.js';
import { ReleaseEntity } from './release.entity.js';

export const ENTITIES = [
  AdminUserEntity,
  AppEntity,
  ReleaseEntity,
  ArtifactEntity,
  ClientEventEntity,
  AuditLogEntity,
];

export {
  AdminUserEntity,
  AppEntity,
  ArtifactEntity,
  AuditLogEntity,
  ClientEventEntity,
  ReleaseEntity,
};
