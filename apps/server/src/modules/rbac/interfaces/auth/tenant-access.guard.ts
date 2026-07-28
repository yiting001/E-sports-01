import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { DEFAULT_TENANT_ID } from '@app/contracts';
import { TenantResolver } from '../../application/tenant-resolver.service';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { AUTH_METADATA } from './metadata';

const TENANT_HEADER = 'x-tenant-code';
const TENANT_FIELD = 'tenantCode';
const TENANT_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$/;

interface TenantRequestBody {
  tenantCode?: unknown;
}

/**
 * 全局租户访问守卫。
 * 公开业务路由按请求租户建立上下文；认证路由则以 JWT 租户为权威，
 * 拒绝客户端显式指定其他租户。普通公开回调不参与租户解析。
 */
@Injectable()
export class TenantAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tenants: TenantResolver,
    private readonly tenant: TenantContextService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const tenantPublic = this.reflector.getAllAndOverride<boolean>(AUTH_METADATA.tenantPublic, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (tenantPublic) {
      const code = this.extractCode(request);
      const tenantId = await this.tenants.resolveOptionalId(code);
      this.tenant.set(tenantId, false);
      this.fillBodyTenantCode(request, code);
      return true;
    }

    const jwtTenantId = this.tenant.tenantId;
    if (!jwtTenantId) {
      return true;
    }
    const platformOnly = this.reflector.getAllAndOverride<boolean>(AUTH_METADATA.platformOnly, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (platformOnly && (!this.tenant.isSuper || jwtTenantId !== DEFAULT_TENANT_ID)) {
      throw new ForbiddenException('仅平台超级管理员可访问');
    }
    const explicitCode = this.extractExplicitCode(request);
    if (!explicitCode) {
      return true;
    }
    const requestedTenantId = await this.tenants.resolveOptionalId(explicitCode);
    if (requestedTenantId !== jwtTenantId) {
      throw new ForbiddenException('请求租户与登录租户不一致');
    }
    return true;
  }

  private extractCode(request: Request): string | undefined {
    const sources = this.readSources(request);
    const unique = [...new Set(sources)];
    if (unique.length > 1) {
      throw new BadRequestException('请求中的租户编码不一致');
    }
    return unique[0];
  }

  private extractExplicitCode(request: Request): string | undefined {
    const sources = [request.headers[TENANT_HEADER], request.query[TENANT_FIELD]];
    const codes = sources.flatMap((value) => this.readSource(value));
    const unique = [...new Set(codes)];
    if (unique.length > 1) {
      throw new BadRequestException('请求中的租户编码不一致');
    }
    return unique[0];
  }

  private readSources(request: Request): string[] {
    const body = this.readBody(request);
    const sources = [request.headers[TENANT_HEADER], request.query[TENANT_FIELD], body?.tenantCode];
    return sources.flatMap((value) => this.readSource(value));
  }

  private readSource(value: unknown): string[] {
    if (value === undefined || value === null || value === '') {
      return [];
    }
    if (Array.isArray(value)) {
      if (value.length !== 1) {
        throw new BadRequestException('租户编码只能指定一次');
      }
      return this.readSource(value[0]);
    }
    if (typeof value !== 'string') {
      throw new BadRequestException('租户编码格式不正确');
    }
    return value.trim() ? [this.normalizeCode(value)] : [];
  }

  private normalizeCode(value: string): string {
    const code = value.trim().toLowerCase();
    if (!TENANT_CODE_PATTERN.test(code)) {
      throw new BadRequestException('租户编码格式不正确');
    }
    return code;
  }

  private fillBodyTenantCode(request: Request, code?: string): void {
    const body = this.readBody(request);
    if (body) {
      body.tenantCode = code;
    }
  }

  private readBody(request: Request): TenantRequestBody | null {
    const body: unknown = request.body;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as TenantRequestBody)
      : null;
  }
}
