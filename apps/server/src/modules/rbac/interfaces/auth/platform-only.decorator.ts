import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from './metadata';

/** 标记仅默认租户平台超级管理员可访问的路由。 */
export const PlatformOnly = (): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_METADATA.platformOnly, true);
