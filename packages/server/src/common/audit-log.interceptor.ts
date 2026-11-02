import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { catchError, tap, throwError } from 'rxjs';
import type { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { AuditLogEntity } from '../database/entities/audit-log.entity.js';
import type { JwtPayload } from './jwt-auth.guard.js';

/**
 * 管理端写操作审计：只记录方法、路径、状态码、账号与 IP，不记录请求体，
 * 避免把密码、文件内容写进日志。
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly logs: Repository<AuditLogEntity>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<
      Request & { user?: JwtPayload }
    >();
    const response = context.switchToHttp().getResponse<Response>();
    const path = request.originalUrl.split('?')[0];

    const shouldLog =
      path.startsWith('/api/v1/admin') &&
      request.method !== 'GET' &&
      !path.endsWith('/auth/login');

    if (!shouldLog) return next.handle();

    const record = (statusCode: number): void => {
      const entry = this.logs.create({
        username: request.user?.username ?? null,
        method: request.method,
        path,
        statusCode,
        ip: request.ip ?? null,
        createdAt: Date.now(),
      });
      void this.logs.save(entry).catch(() => undefined);
    };

    return next.handle().pipe(
      tap(() => record(response.statusCode || 200)),
      catchError((error: unknown) => {
        const status =
          error instanceof HttpException ? error.getStatus() : 500;
        record(status);
        return throwError(() => error);
      }),
    );
  }
}
