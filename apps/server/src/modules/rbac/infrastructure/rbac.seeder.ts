import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { loadEnvConfig } from '../../../bootstrap/env.config';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../domain/permission-repository.interface';
import { DEFAULT_PERMISSIONS } from '../domain/permission-defaults';
import { SUPER_ADMIN_ROLE } from '../domain/rbac.constants';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../domain/role-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/user-repository.interface';
import { PasswordService } from './password.service';

/**
 * RBAC 启动播种器。
 * 幂等地补齐：api 权限、超级管理员角色、初始管理员账号。
 * 仅在缺失时创建，已存在则跳过，可安全重复执行。
 */
@Injectable()
export class RbacSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(RbacSeeder.name);
  private readonly env = loadEnvConfig();

  constructor(
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly password: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const createdPerms = await this.permRepo.createMissing(DEFAULT_PERMISSIONS);
    if (createdPerms > 0) {
      this.logger.log(`已播种 ${createdPerms} 条接口权限`);
    }
    const superRole = await this.ensureSuperRole();
    await this.ensureAdminUser(superRole.id);
  }

  private async ensureSuperRole() {
    const existing = await this.roleRepo.findByCode(SUPER_ADMIN_ROLE);
    if (existing) {
      return existing;
    }
    const role = this.roleRepo.create({
      code: SUPER_ADMIN_ROLE,
      name: '超级管理员',
      remark: '内置角色，拥有全部权限',
    });
    this.logger.log('已创建超级管理员角色');
    return this.roleRepo.save(role);
  }

  private async ensureAdminUser(superRoleId: string): Promise<void> {
    const { adminUsername, adminPassword } = this.env.seed;
    if (await this.userRepo.existsByUsername(adminUsername)) {
      return;
    }
    const role = await this.roleRepo.findById(superRoleId);
    const user = this.userRepo.create({
      username: adminUsername,
      passwordHash: await this.password.hash(adminPassword),
      nickname: '超级管理员',
      roles: role ? [role] : [],
    });
    await this.userRepo.save(user);
    this.logger.warn(`已创建初始管理员 [${adminUsername}]，请尽快修改默认密码`);
  }
}
