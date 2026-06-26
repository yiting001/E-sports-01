import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA } from './metadata';

/** 标记路由为公开，跳过全局 JWT 鉴权（如登录、注册） */
export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(AUTH_METADATA.isPublic, true);
