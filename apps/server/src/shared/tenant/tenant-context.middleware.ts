import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextService } from './tenant-context.service';

/**
 * 租户上下文中间件。
 * 为每个 HTTP 请求建立一个空的租户 AsyncLocalStorage 上下文；
 * 真正的 tenantId/isSuper 由 JWT 策略在鉴权通过后写入（见 JwtStrategy）。
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly tenant: TenantContextService) {}

  use(_req: Request, _res: Response, next: NextFunction): void {
    this.tenant.run({ tenantId: null, isSuper: false }, () => next());
  }
}
