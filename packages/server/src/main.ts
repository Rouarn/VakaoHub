import 'reflect-metadata';
import { Logger, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { env } from './config/env.js';
import { ensureStorage } from './utils/paths.js';

async function bootstrap(): Promise<void> {
  await ensureStorage();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(compression());
  app.use(cors({ origin: env.corsOrigins, credentials: false }));

  // 生产环境默认关闭 Swagger，避免暴露内部接口结构
  if (!env.isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('VaKao Hub API')
      .setDescription('VaKao 软件中心：应用目录、版本发布、产物分发与更新检查')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(env.port);
  Logger.log(
    `VaKao Hub 已启动：http://127.0.0.1:${env.port}/api/v1（文档 /api/docs）`,
    'Bootstrap',
  );
}

void bootstrap();
