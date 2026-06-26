import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiResponse, BizCode } from '@app/contracts';
import { Observable, map } from 'rxjs';

/**
 * 统一成功响应包装拦截器。
 * 把控制器返回的裸数据包成 { code, message, data, timestamp }，
 * 让前端有一致的解析约定。仅作用于 HTTP（非 WebSocket）。
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    if (context.getType() !== 'http') {
      return next.handle() as unknown as Observable<ApiResponse<T>>;
    }
    return next.handle().pipe(
      map((data) => ({
        code: BizCode.Success,
        message: 'ok',
        data,
        timestamp: Date.now(),
      })),
    );
  }
}
