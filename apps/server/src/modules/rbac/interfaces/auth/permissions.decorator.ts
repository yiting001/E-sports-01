import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from './metadata';

/** 声明访问该路由所需的权限码（满足全部即放行） */
export const Permissions = (...codes: string[]): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_METADATA.permissions, codes);
