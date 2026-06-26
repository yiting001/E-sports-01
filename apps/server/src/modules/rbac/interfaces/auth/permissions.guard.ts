import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PermissionResolver } from '../../application/permission-resolver.service';
import { AUTH_METADATA, AuthUser } from './metadata';

/**
 * 权限守卫。
 * 读取 @Permissions() 声明的权限码，与当前用户的权限集合比对；
 * 超级管理员直接放行。无声明的路由仅需登录态即可访问。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolver: PermissionResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 仅守卫 HTTP 路由；WebSocket 在网关握手阶段自行鉴权
    if (context.getType() !== 'http') {
      return true;
    }
    const required = this.reflector.getAllAndOverride<string[]>(AUTH_METADATA.permissions, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('未认证');
    }
    const auth = await this.resolver.resolve(user.id);
    if (auth.isSuper) {
      return true;
    }
    const granted = new Set(auth.permissions);
    const ok = required.every((code) => granted.has(code));
    if (!ok) {
      throw new ForbiddenException('权限不足');
    }
    return true;
  }
}
