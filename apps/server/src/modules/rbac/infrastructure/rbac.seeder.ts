import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import {
  BOOSTER_ROLE_CODE,
  DEFAULT_TENANT_CODE,
  DEFAULT_TENANT_ID,
  PermissionType,
  PERMS,
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
} from '../domain/rbac.constants';
import { Permission } from '../domain/permission.entity';
import { Role } from '../domain/role.entity';
import { ROLE_REPOSITORY, RoleRepository } from '../domain/role-repository.interface';
import { TENANT_REPOSITORY, TenantRepository } from '../domain/tenant-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../domain/user-repository.interface';
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
    await this.ensureTenantAdminRefundPermission();
    await this.ensureAdminUser(superRole.id);
  }

  /** 保留升级兼容：存量租户管理员至少具备退款审核权限。 */
  private async ensureTenantAdminRefundPermission(): Promise<void> {
    const roles = await this.roleRepo.findAllByCode(TENANT_ADMIN_ROLE);
    let changed = false;
    for (const role of roles) {
      changed = (await this.ensureRolePermissions(role, [PERMS.order.refundReview])) || changed;
    }
    if (changed) {
      await this.permissions.invalidateAll();
    }
  }

  /** 为全部存量租户幂等补齐四类基础角色及其内置权限。 */
  private async ensureTenantBaseRoles(): Promise<void> {
    const tenants = await this.tenantRepo.findAll();
    const allPermissions = await this.permRepo.findAll();
    const tenantAdminPermissions = allPermissions.filter(
      (permission) => !isPlatformOnlyPermission(permission.code),
    );
    let changed = false;
    for (const tenant of tenants) {
      if (tenant.id !== DEFAULT_TENANT_ID) {
        changed = (await this.ensureTenantAdminRole(tenant.id, tenantAdminPermissions)) || changed;
      }
      changed =
        (await this.ensureBuiltinRole(
          tenant.id,
          MEMBER_ROLE,
          '普通用户',
          '内置角色，短信自助注册用户默认角色',
        )) || changed;
      changed =
        (await this.ensureBuiltinRole(
          tenant.id,
          SERVICE_ROLE,
          '客服',
          '内置角色，负责接待用户咨询/处理订单，可被商品关联为负责客服',
          SERVICE_ROLE_PERMISSION_CODES,
        )) || changed;
      changed =
        (await this.ensureBuiltinRole(
          tenant.id,
          BOOSTER_ROLE_CODE,
          '打手',
          '内置角色，打手入驻申请审核通过后自动授予',
        )) || changed;
    }
    if (changed) {
      await this.permissions.invalidateAll();
    }
  }

  private async ensureTenantAdminRole(
    tenantId: string,
    permissions: Permission[],
  ): Promise<boolean> {
    const existing = await this.roleRepo.findByCodeForTenant(TENANT_ADMIN_ROLE, tenantId);
    if (!existing) {
      await this.roleRepo.save(
        this.roleRepo.create({
          code: TENANT_ADMIN_ROLE,
          name: '租户管理员',
          remark: '内置角色，拥有本租户业务权限',
          tenantId,
          permissions,
        }),
      );
      return true;
    }
    const current = new Set((existing.permissions ?? []).map((permission) => permission.code));
    const expected = new Set(permissions.map((permission) => permission.code));
    const unchanged =
      current.size === expected.size && [...expected].every((code) => current.has(code));
    if (unchanged) {
      return false;
    }
    existing.permissions = permissions;
    await this.roleRepo.save(existing);
    return true;
  }

  private async ensureBuiltinRole(
    tenantId: string,
    code: string,
    name: string,
    remark: string,
    permissionCodes: string[] = [],
  ): Promise<boolean> {
    let role = await this.roleRepo.findByCodeForTenant(code, tenantId);
    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          code,
          name,
          remark,
          tenantId,
          permissions: [],
        }),
      );
      await this.ensureRolePermissions(role, permissionCodes);
      return true;
    }
    return this.ensureRolePermissions(role, permissionCodes);
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

  /** 幂等地为角色补齐给定权限码（仅新增缺失项，保留管理员后续手动授予的权限） */
  private async ensureRolePermissions(role: Role, codes: string[]): Promise<boolean> {
    const owned = new Set((role.permissions ?? []).map((p) => p.code));
    const missing = codes.filter((code) => !owned.has(code));
    if (missing.length === 0) {
      return false;
    }
    const granted: Permission[] = [];
    for (const code of missing) {
      const perm = await this.permRepo.findByCode(code);
      if (perm) {
        granted.push(perm);
      }
    }
    if (granted.length === 0) {
      return false;
    }
    role.permissions = [...(role.permissions ?? []), ...granted];
    await this.roleRepo.save(role);
    this.logger.log(`角色 ${role.code} 补齐 ${granted.length} 项权限`);
    return true;
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
