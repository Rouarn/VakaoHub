import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { JwtPayload } from '../../common/jwt-auth.guard.js';
import { Public } from '../../common/public.decorator.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { LoginDto } from './dto/login.dto.js';

@ApiTags('管理端 · 认证')
@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: '管理员登录' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('change-password')
  @ApiOperation({ summary: '修改管理员密码' })
  changePassword(
    @Req() request: Request,
    @Body() dto: ChangePasswordDto,
  ) {
    const user = (request as Request & { user?: JwtPayload }).user;
    if (!user) throw new UnauthorizedException('请先登录');
    return this.authService.changePassword(user.sub, dto);
  }
}
