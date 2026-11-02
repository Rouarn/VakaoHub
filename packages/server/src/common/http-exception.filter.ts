import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface ErrorBody {
  code: number;
  message: string | string[];
  success: false;
  timestamp: string;
  url: string;
  data: unknown;
}

/** 全局异常过滤：统一错误信封，5xx 不泄露堆栈 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, message } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status} ${String(message)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (response.headersSent) return;

    const body: ErrorBody = {
      code: status,
      message,
      success: false,
      timestamp: new Date().toISOString(),
      url: request.originalUrl,
      data: {},
    };
    response.status(status).json(body);
  }

  private normalize(exception: unknown): {
    status: number;
    message: string | string[];
  } {
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string } | undefined;
      if (driverError?.code === 'ER_DUP_ENTRY') {
        return { status: HttpStatus.CONFLICT, message: '数据已存在，请检查唯一字段' };
      }
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      let message: string | string[] = exception.message;
      if (typeof payload === 'string') {
        message = payload;
      } else if (payload && typeof payload === 'object') {
        const value = (payload as { message?: string | string[] }).message;
        if (value) message = value;
      }
      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return { status, message: '请求过于频繁，请稍后再试' };
      }
      return { status, message };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: '服务器内部错误' };
  }
}
