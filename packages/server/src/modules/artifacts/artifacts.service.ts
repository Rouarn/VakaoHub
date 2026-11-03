import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { rm, rename, stat, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { Repository } from 'typeorm';
import { env } from '../../config/env.js';
import { AppEntity } from '../../database/entities/app.entity.js';
import { ArtifactEntity } from '../../database/entities/artifact.entity.js';
import { ReleaseEntity } from '../../database/entities/release.entity.js';
import { sha256File } from '../../utils/hash.js';
import { validateArtifactFile } from './validate.js';
import { resolveStoragePath, safeFileName } from '../../utils/paths.js';
import type { UploadArtifactDto } from './dto/upload-artifact.dto.js';

/** 产物格式与平台的基本一致性 */
const FORMAT_PLATFORM: Record<string, string[]> = {
  apk: ['android'],
  dmg: ['darwin'],
  msi: ['win32'],
  exe: ['win32'],
  zip: ['android', 'darwin', 'win32', 'linux'],
  appimage: ['linux'],
  deb: ['linux'],
};

@Injectable()
export class ArtifactsService {
  constructor(
    @InjectRepository(ArtifactEntity)
    private readonly artifacts: Repository<ArtifactEntity>,
    @InjectRepository(ReleaseEntity)
    private readonly releases: Repository<ReleaseEntity>,
    @InjectRepository(AppEntity)
    private readonly apps: Repository<AppEntity>,
  ) {}

  async upload(
    dto: UploadArtifactDto,
    file: Express.Multer.File | undefined,
  ): Promise<ArtifactEntity> {
    if (!file) throw new BadRequestException('请上传文件（字段名 file）');

    const release = await this.releases.findOne({
      where: { id: dto.releaseId },
    });
    if (!release) throw new NotFoundException('版本不存在');
    if (release.status !== 0 && release.status !== 3) {
      throw new BadRequestException('只有草稿或已下架版本可以上传产物');
    }

    const app = await this.apps.findOne({ where: { id: release.appId } });
    if (!app) throw new NotFoundException('应用不存在');

    const allowedPlatforms = FORMAT_PLATFORM[dto.format];
    if (!allowedPlatforms || !allowedPlatforms.includes(dto.platform)) {
      throw new BadRequestException(
        `格式 ${dto.format} 不能用于平台 ${dto.platform}`,
      );
    }

    const lowerName = file.originalname.toLowerCase();
    if (!lowerName.endsWith(`.${dto.format}`)) {
      throw new BadRequestException(`文件扩展名必须为 .${dto.format}`);
    }

    try {
      const duplicated = await this.artifacts.findOne({
        where: {
          releaseId: release.id,
          platform: dto.platform,
          arch: dto.arch,
          format: dto.format,
        },
      });
      if (duplicated) {
        throw new ConflictException('该平台/架构/格式的产物已存在，请先删除');
      }

      const magicOk = await validateArtifactFile(file.path, dto.format);
      if (!magicOk) {
        throw new BadRequestException(
          `文件内容与 ${dto.format} 格式不匹配，请检查上传文件`,
        );
      }

      const sha256 = await sha256File(file.path);
      const info = await stat(file.path);
      // 历史版本可能存有未校验的 versionName，目录名同样做安全化，防止 ../ 逃逸
      const versionDir = safeFileName(
        `v${release.versionCode}_${release.versionName}`,
      );
      const dir = join(env.storageDir, app.appKey, versionDir);
      await mkdir(dir, { recursive: true });

      const fileName = safeFileName(
        `${dto.platform}-${dto.arch}-${dto.format}-${file.originalname}`,
      );
      const finalPath = join(dir, fileName);
      await rename(file.path, finalPath);

      try {
        return await this.artifacts.save(
        this.artifacts.create({
          releaseId: release.id,
          platform: dto.platform,
          arch: dto.arch,
          format: dto.format,
          fileName: file.originalname,
          relPath: relative(env.storageDir, finalPath),
          size: info.size,
          sha256,
          minOs: dto.minOs ?? null,
          signature: dto.signature ?? null,
          notarized: dto.notarized === 'true' || dto.notarized === '1' ? 1 : 0,
          downloadCount: 0,
          createdAt: Date.now(),
        }),
      );
      } catch (error) {
        await rm(finalPath, { force: true }).catch(() => undefined);
        throw error;
      }
    } catch (error) {
      await rm(file.path, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  async remove(id: number): Promise<{ success: true }> {
    const artifact = await this.artifacts.findOne({ where: { id } });
    if (!artifact) throw new NotFoundException('产物不存在');

    const release = await this.releases.findOne({
      where: { id: artifact.releaseId },
    });
    if (release && (release.status === 1 || release.status === 2)) {
      throw new BadRequestException('发布中的版本产物不可删除，请先下架');
    }

    await this.artifacts.remove(artifact);
    await rm(resolveStoragePath(artifact.relPath), { force: true });
    return { success: true };
  }
}
