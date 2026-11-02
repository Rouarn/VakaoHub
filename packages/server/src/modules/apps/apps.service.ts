import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { Repository } from 'typeorm';
import { env } from '../../config/env.js';
import { AppEntity } from '../../database/entities/app.entity.js';
import type { CreateAppDto } from './dto/create-app.dto.js';
import type { UpdateAppDto } from './dto/update-app.dto.js';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
  ) {}

  list() {
    return this.apps.find({ order: { createdAt: 'DESC' } });
  }

  async getById(id: number): Promise<AppEntity> {
    const app = await this.apps.findOne({ where: { id } });
    if (!app) throw new NotFoundException('应用不存在');
    return app;
  }

  async getByKey(appKey: string): Promise<AppEntity> {
    const app = await this.apps.findOne({ where: { appKey } });
    if (!app) throw new NotFoundException('应用不存在');
    return app;
  }

  async create(dto: CreateAppDto): Promise<AppEntity> {
    const exists = await this.apps.findOne({ where: { appKey: dto.appKey } });
    if (exists) throw new ConflictException('appKey 已存在');

    const now = Date.now();
    return this.apps.save(
      this.apps.create({
        appKey: dto.appKey,
        name: dto.name,
        description: dto.description ?? null,
        iconUrl: dto.iconUrl ?? null,
        category: dto.category ?? null,
        repoUrl: dto.repoUrl ?? null,
        homepage: dto.homepage ?? null,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  async update(id: number, dto: UpdateAppDto): Promise<AppEntity> {
    const app = await this.getById(id);
    Object.assign(app, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.iconUrl !== undefined ? { iconUrl: dto.iconUrl } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.repoUrl !== undefined ? { repoUrl: dto.repoUrl } : {}),
      ...(dto.homepage !== undefined ? { homepage: dto.homepage } : {}),
      updatedAt: Date.now(),
    });
    return this.apps.save(app);
  }

  async remove(id: number): Promise<{ success: true }> {
    const app = await this.getById(id);
    // 版本与产物由数据库外键级联删除；磁盘目录随应用一起清理
    await this.apps.remove(app);
    await rm(join(env.storageDir, app.appKey), { recursive: true, force: true });
    return { success: true };
  }
}
