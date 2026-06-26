import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../shared/redis/redis.constants';
import { SUPER_ADMIN_ROLE } from '../domain/rbac.constants';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../domain/role-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/user-repository.interface';

/** 用户的鉴权上下文：角色码、扁平权限码、是否超管 */
export interface UserAuthContext {
  roles: string[];
  permissions: string[];
  isSuper: boolean;
}

/**
 * 权限解析服务。
 * 聚合用户 → 角色 → 权限，得到扁平权限码集合，并用 Redis 缓存，
 * 避免每次请求都做多表关联查询。角色/权限变更时需调用 invalidate。
 */
@Injectable()
export class PermissionResolver {
  private static readonly CACHE_PREFIX = 'perm:user:';
  private static readonly CACHE_TTL_SECONDS = 600;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async resolve(userId: string): Promise<UserAuthContext> {
    const cached = await this.readCache(userId);
    if (cached) {
      return cached;
    }
    const context = await this.compute(userId);
    await this.writeCache(userId, context);
    return context;
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.del(PermissionResolver.CACHE_PREFIX + userId).catch(() => undefined);
  }

  /** 角色/权限关系变更时，清空所有用户的鉴权缓存 */
  async invalidateAll(): Promise<void> {
    try {
      const keys = await this.redis.keys(PermissionResolver.CACHE_PREFIX + '*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch {
      // 缓存不可用时忽略，TTL 到期后自动失效
    }
  }

  private async compute(userId: string): Promise<UserAuthContext> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return { roles: [], permissions: [], isSuper: false };
    }
    const roleIds = (user.roles ?? []).map((r) => r.id);
    const roles = await this.roleRepo.findByIds(roleIds);
    const roleCodes = roles.map((r) => r.code);
    const permissions = new Set<string>();
    for (const role of roles) {
      for (const perm of role.permissions ?? []) {
        permissions.add(perm.code);
      }
    }
    return {
      roles: roleCodes,
      permissions: [...permissions],
      isSuper: roleCodes.includes(SUPER_ADMIN_ROLE),
    };
  }

  private async readCache(userId: string): Promise<UserAuthContext | null> {
    try {
      const raw = await this.redis.get(PermissionResolver.CACHE_PREFIX + userId);
      return raw ? (JSON.parse(raw) as UserAuthContext) : null;
    } catch {
      return null;
    }
  }

  private async writeCache(userId: string, context: UserAuthContext): Promise<void> {
    try {
      await this.redis.set(
        PermissionResolver.CACHE_PREFIX + userId,
        JSON.stringify(context),
        'EX',
        PermissionResolver.CACHE_TTL_SECONDS,
      );
    } catch {
      // 忽略缓存写入失败
    }
  }
}
