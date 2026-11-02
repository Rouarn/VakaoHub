import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  success: boolean;
  timestamp: string;
  data: T;
}

/** 统一成功信封：业务成功码固定 200，与 HTTP 状态行解耦 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: HttpStatus.OK,
        message: '请求成功',
        success: true,
        timestamp: new Date().toISOString(),
        data: (data ?? null) as T,
      })),
    );
  }
}
