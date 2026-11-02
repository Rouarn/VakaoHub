import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { env } from '../../config/env.js';
import { AdminUserEntity } from '../../database/entities/admin-user.entity.js';
import type { ChangePasswordDto } from './dto/change-password.dto.js';
import type { LoginDto } from './dto/login.dto.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(AdminUserEntity)
    private readonly users: Repository<AdminUserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /** 首次启动创建管理员；已存在时不覆盖密码 */
  async onModuleInit(): Promise<void> {
    const exists = await this.users.findOne({
      where: { username: env.admin.username },
    });
    if (exists) return;

    const passwordHash = await hash(env.admin.password, 10);
    await this.users.save(
      this.users.create({
        username: env.admin.username,
        passwordHash,
        displayName: '管理员',
        tokenVersion: 0,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: Date.now(),
      }),
    );
    this.logger.warn(
      `已创建管理员 ${env.admin.username}，请立即修改默认密码（管理端「修改密码」）`,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({ where: { username: dto.username } });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const now = Date.now();
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.ceil((user.lockedUntil - now) / 60_000);
      throw new UnauthorizedException(
        `登录失败次数过多，请 ${minutes} 分钟后再试`,
      );
    }

    const matched = await compare(dto.password, user.passwordHash);
    if (!matched) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = now + LOCK_DURATION_MS;
        await this.users.save(user);
        throw new UnauthorizedException(
          `登录失败次数过多，账号已锁定 ${LOCK_DURATION_MS / 60_000} 分钟`,
        );
      }
      await this.users.save(user);
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.failedLoginAttempts !== 0 || user.lockedUntil !== null) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await this.users.save(user);
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        username: user.username,
        ver: user.tokenVersion,
      },
      { expiresIn: env.jwt.expiresIn as unknown as number },
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: env.jwt.expiresIn,
      username: user.username,
    };
  }

  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ success: true }> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('管理员不存在');

    const matched = await compare(dto.oldPassword, user.passwordHash);
    if (!matched) throw new UnauthorizedException('原密码错误');
    if (dto.oldPassword === dto.newPassword) {
      throw new UnauthorizedException('新密码不能与原密码相同');
    }

    user.passwordHash = await hash(dto.newPassword, 10);
    // 令牌版本 +1：已签发的 JWT 立即失效
    user.tokenVersion += 1;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.users.save(user);
    return { success: true };
  }
}
