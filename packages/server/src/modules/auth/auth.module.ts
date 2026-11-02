import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUserEntity } from '../../database/entities/admin-user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminUserEntity])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
