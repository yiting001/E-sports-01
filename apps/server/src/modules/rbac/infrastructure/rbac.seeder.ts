import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_ID,
  PermissionType,
  TenantStatus,
} from '@app/contracts';
import { loadEnvConfig } from '../../../bootstrap/env.config';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../domain/permission-repository.interface';
import { DEFAULT_PERMISSIONS } from '../domain/permission-defaults';
import { DEFAULT_MENU_PERMISSIONS } from '../domain/menu-defaults';
import { SUPER_ADMIN_ROLE } from '../domain/rbac.constants';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../domain/role-repository.interface';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../domain/tenant-repository.interface';
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
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
    private readonly password: PasswordService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureDefaultTenant();
    const createdPerms = await this.permRepo.createMissing(DEFAULT_PERMISSIONS);
    if (createdPerms > 0) {
      this.logger.log(`已播种 ${createdPerms} 条接口权限`);
    }
    const createdMenus = await this.permRepo.createMissing(DEFAULT_MENU_PERMISSIONS);
    if (createdMenus > 0) {
      this.logger.log(`已播种 ${createdMenus} 条菜单权限`);
    }
    await this.pruneObsoleteMenus();
    const superRole = await this.ensureSuperRole();
    await this.ensureAdminUser(superRole.id);
  }

  /**
   * 确保内置默认租户存在（固定主键 = 各租户表 tenant_id 列默认值）。
   * 历史数据随建列默认值归入该租户，无需数据迁移。
   */
  private async ensureDefaultTenant(): Promise<void> {
    const existing = await this.tenantRepo.findById(DEFAULT_TENANT_ID);
    if (existing) {
      return;
    }
    const tenant = this.tenantRepo.create({
      id: DEFAULT_TENANT_ID,
      code: DEFAULT_TENANT_CODE,
      name: '默认租户',
      status: TenantStatus.Enabled,
      remark: '内置默认租户，承载历史数据与平台超级管理员',
      builtin: true,
    });
    await this.tenantRepo.save(tenant);
    this.logger.log('已创建内置默认租户');
  }

  /** 清理不在当前菜单清单中的历史 menu 权限（如旧的命名方案），多对多关联随之级联删除 */
  private async pruneObsoleteMenus(): Promise<void> {
    const valid = new Set(DEFAULT_MENU_PERMISSIONS.map((m) => m.code));
    const all = await this.permRepo.findAll();
    const obsolete = all.filter(
      (p) => p.type === PermissionType.Menu && !valid.has(p.code),
    );
    for (const permission of obsolete) {
      await this.permRepo.remove(permission.id);
    }
    if (obsolete.length > 0) {
      this.logger.log(`已清理 ${obsolete.length} 条历史菜单权限`);
    }
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
      tenantId: DEFAULT_TENANT_ID,
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
      tenantId: DEFAULT_TENANT_ID,
    });
    await this.userRepo.save(user);
    this.logger.warn(`已创建初始管理员 [${adminUsername}]，请尽快修改默认密码`);
  }
}
