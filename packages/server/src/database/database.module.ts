import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { ENTITIES } from './entities/index.js';

const currentDir = dirname(fileURLToPath(import.meta.url));

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: env.db.host,
      port: env.db.port,
      username: env.db.username,
      password: env.db.password,
      database: env.db.database,
      entities: ENTITIES,
      migrations: [join(currentDir, 'migrations/*.js')],
      synchronize: env.db.synchronize,
      migrationsRun: env.db.migrationsRun,
      logging: env.db.logging,
      charset: 'utf8mb4',
      timezone: '+08:00',
      extra: { connectionLimit: 10 },
    }),
  ],
})
export class DatabaseModule {}
