import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogInterceptor } from './common/audit-log.interceptor.js';
import { AllExceptionsFilter } from './common/http-exception.filter.js';
import { JwtAuthGuard } from './common/jwt-auth.guard.js';
import { ResponseInterceptor } from './common/response.interceptor.js';
import { env } from './config/env.js';
import { AdminUserEntity } from './database/entities/admin-user.entity.js';
import { AuditLogEntity } from './database/entities/audit-log.entity.js';
import { DatabaseModule } from './database/database.module.js';
import { AppsModule } from './modules/apps/apps.module.js';
import { ArtifactsModule } from './modules/artifacts/artifacts.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { ReleasesModule } from './modules/releases/releases.module.js';
import { StatsModule } from './modules/stats/stats.module.js';
import { UpdatesModule } from './modules/updates/updates.module.js';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      global: true,
      secret: env.jwt.secret,
      signOptions: { algorithm: 'HS256' },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    TypeOrmModule.forFeature([AdminUserEntity, AuditLogEntity]),
    AuthModule,
    AppsModule,
    ReleasesModule,
    ArtifactsModule,
    UpdatesModule,
    CatalogModule,
    StatsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
