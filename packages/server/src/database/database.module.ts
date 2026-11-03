import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { env } from '../config/env.js';
import {
  CONNECTION_LIMITS,
  connectionOptions,
  MIGRATIONS,
} from './connection.js';
import { ENTITIES } from './entities/index.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...connectionOptions,
      entities: ENTITIES,
      migrations: MIGRATIONS,
      synchronize: env.db.synchronize,
      migrationsRun: env.db.migrationsRun,
      logging: env.db.logging,
      extra: { connectionLimit: CONNECTION_LIMITS.app },
    }),
  ],
})
export class DatabaseModule {}
