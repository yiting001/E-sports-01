import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiResponse, BizCode } from '@app/contracts';
import { Response } from 'express';

/**
 * 全局异常过滤器。
 * 将任意异常归一化为统一响应结构，避免把堆栈直接暴露给前端。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    // WebSocket 异常由网关自身处理，这里只兜底 HTTP
    if (host.getType() !== 'http') {
      return;
    }
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const { status, code, message } = this.normalize(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    }

    const body: ApiResponse<null> = { code, message, data: null, timestamp: Date.now() };
    response.status(status).json(body);
  }

  private normalize(exception: unknown): { status: number; code: number; message: string } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ?? exception.message);
      return {
        status,
        code: status,
        message: Array.isArray(message) ? message.join('; ') : message,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: BizCode.ServerError,
      message: '服务器内部错误',
    };
  }
}
