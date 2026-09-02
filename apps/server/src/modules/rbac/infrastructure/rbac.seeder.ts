import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  BOOSTER_ROLE_CODE,
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_ID,
  PermissionType,
  TenantStatus,
} from '@app/contracts';
import { loadEnvConfig } from '../../../bootstrap/env.config';
import { PermissionResolver } from '../application/permission-resolver.service';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../domain/permission-repository.interface';
import { DEFAULT_PERMISSIONS } from '../domain/permission-defaults';
import { DEFAULT_MENU_PERMISSIONS } from '../domain/menu-defaults';
import {
  MEMBER_ROLE,
  isPlatformOnlyPermission,
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  SUPER_ADMIN_ROLE,
  TENANT_ADMIN_ROLE,
  TENANT_ADMIN_ROLE_REMARK,
} from '../domain/rbac.constants';
import { Permission } from '../domain/permission.entity';
import { ROLE_REPOSITORY, RoleRepository } from '../domain/role-repository.interface';
import { TENANT_REPOSITORY, TenantRepository } from '../domain/tenant-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../domain/user-repository.interface';
import { PasswordService } from './password.service';

/**
 * RBAC 启动播种器。
 * 幂等地补齐：api/menu 权限、默认租户、超级管理员角色、各租户内置角色、初始管理员账号。
 * 角色仅在缺失时创建；存量角色的权限由平台超管手动维护，
 * 启动时只剔除租户角色不应持有的平台级权限，不回填或新增任何权限。
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
    @Inject(PermissionResolver)
    private readonly permissions: Pick<PermissionResolver, 'invalidateAll'>,
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
    await this.ensureTenantBaseRoles();
    await this.pruneTenantPlatformPermissions();
    await this.ensureAdminUser(superRole.id);
  }

  /**
   * 为全部存量租户补齐缺失的四类基础角色。
   * 仅新建缺失角色；已存在的角色不读取、不改写权限，避免覆盖超管手动维护的授权。
   */
  private async ensureTenantBaseRoles(): Promise<void> {
    const tenants = await this.tenantRepo.findAll();
    const allPermissions = await this.permRepo.findAll();
    const permissionsByCode = new Map(allPermissions.map((permission) => [permission.code, permission]));
    const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map((code) =>
      permissionsByCode.get(code),
    ).filter((permission): permission is Permission => permission !== undefined);
    let created = 0;
    for (const tenant of tenants) {
      if (tenant.id !== DEFAULT_TENANT_ID) {
        created += await this.createRoleIfMissing(
          tenant.id,
          TENANT_ADMIN_ROLE,
          '租户管理员',
          TENANT_ADMIN_ROLE_REMARK,
          [],
        );
      }
      created += await this.createRoleIfMissing(
        tenant.id,
        MEMBER_ROLE,
        '普通用户',
        '内置角色，短信自助注册用户默认角色',
        [],
      );
      created += await this.createRoleIfMissing(
        tenant.id,
        SERVICE_ROLE,
        '客服',
        '内置角色，负责接待用户咨询/处理订单，可被商品关联为负责客服',
        servicePermissions,
      );
      created += await this.createRoleIfMissing(
        tenant.id,
        BOOSTER_ROLE_CODE,
        '打手',
        '内置角色，打手入驻申请审核通过后自动授予',
        [],
      );
    }
    if (created > 0) {
      this.logger.log(`已为存量租户补齐 ${created} 个缺失的内置角色`);
      await this.permissions.invalidateAll();
    }
  }

  private async createRoleIfMissing(
    tenantId: string,
    code: string,
    name: string,
    remark: string,
    permissions: Permission[],
  ): Promise<number> {
    if (await this.roleRepo.existsByCodeForTenantWithDeleted(code, tenantId)) {
      return 0;
    }
    await this.roleRepo.save(this.roleRepo.create({ code, name, remark, tenantId, permissions }));
    return 1;
  }

  /**
   * 安全收敛：非默认租户的角色不得持有平台级权限（租户/权限目录、全局规则写、角色管理写）。
   * 只删不增，用于清理旧版播种或平台级范围扩大前遗留的授权。
   */
  private async pruneTenantPlatformPermissions(): Promise<void> {
    const roles = await this.roleRepo.findAllOutsideTenant(DEFAULT_TENANT_ID);
    let pruned = 0;
    for (const role of roles) {
      const owned = role.permissions ?? [];
      const kept = owned.filter((permission) => !isPlatformOnlyPermission(permission.code));
      if (kept.length === owned.length) {
        continue;
      }
      role.permissions = kept;
      await this.roleRepo.save(role);
      pruned += owned.length - kept.length;
    }
    if (pruned > 0) {
      this.logger.warn(`已从租户角色移除 ${pruned} 项平台级权限`);
      await this.permissions.invalidateAll();
    }
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
    const obsolete = all.filter((p) => p.type === PermissionType.Menu && !valid.has(p.code));
    for (const permission of obsolete) {
      await this.permRepo.remove(permission.id);
    }
    if (obsolete.length > 0) {
      this.logger.log(`已清理 ${obsolete.length} 条历史菜单权限`);
    }
  }

  private async ensureSuperRole() {
    const existing = await this.roleRepo.findByCodeForTenant(SUPER_ADMIN_ROLE, DEFAULT_TENANT_ID);
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
    if (await this.userRepo.existsByUsername(adminUsername, DEFAULT_TENANT_ID)) {
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
