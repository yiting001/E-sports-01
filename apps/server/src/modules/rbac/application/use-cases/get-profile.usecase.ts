import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AuthProfile } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PermissionResolver } from '../permission-resolver.service';
import { TenantResolver } from '../tenant-resolver.service';

/** 用例：获取当前登录用户概要（含角色、扁平权限码与所属租户） */
@Injectable()
export class GetProfileUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly resolver: PermissionResolver,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(userId: string): Promise<AuthProfile> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const auth = await this.resolver.resolve(userId);
    const tenant = await this.tenants.findById(user.tenantId);
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      roles: auth.roles,
      permissions: auth.permissions,
      isSuper: auth.isSuper,
      tenantCode: tenant?.code ?? '',
      tenantName: tenant?.name ?? '',
    };
  }
}
