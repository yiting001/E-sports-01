import { applyDecorators, SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from './metadata';
import { Public } from './public.decorator';

/** 标记免登录但必须解析租户的业务路由。 */
export const TenantPublic = (): MethodDecorator & ClassDecorator =>
  applyDecorators(Public(), SetMetadata(AUTH_METADATA.tenantPublic, true));
