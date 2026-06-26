import { Inject, Injectable } from '@nestjs/common';
import { MenuView, PermissionType } from '@app/contracts';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { toMenuView } from '../menu.mapper';

/**
 * 用例：获取当前用户可见菜单。
 * 取全部 menu 类型权限，按用户已授权的权限码过滤（超管放行全部），按 sort 升序下发。
 * 角色未分配某菜单权限时该菜单不下发，前端据此不渲染、路由守卫亦拦截。
 */
@Injectable()
export class GetMyMenusUseCase {
  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
    private readonly resolver: PermissionResolver,
  ) {}

  async execute(userId: string): Promise<MenuView[]> {
    const auth = await this.resolver.resolve(userId);
    const granted = new Set(auth.permissions);
    const permissions = await this.permRepo.findAll();
    return permissions
      .filter((p) => p.type === PermissionType.Menu)
      .filter((p) => auth.isSuper || granted.has(p.code))
      .sort((a, b) => a.sort - b.sort)
      .map(toMenuView);
  }
}
