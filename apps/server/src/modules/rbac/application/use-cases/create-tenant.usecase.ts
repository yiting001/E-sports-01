import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { CreateTenantPayload, PERMS, TenantStatus, TenantView } from '@app/contracts';
import { loadEnvConfig } from '../../../../bootstrap/env.config';
import {
  PERMISSION_REPOSITORY,
  PermissionRepository,
} from '../../domain/permission-repository.interface';
import { TENANT_ADMIN_ROLE } from '../../domain/rbac.constants';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '../../domain/role-repository.interface';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { toTenantView } from '../tenant.mapper';

/** 平台级「租户管理」权限码前缀：租户管理员角色不应拥有这些跨租户权限 */
const PLATFORM_ONLY_PREFIX = `${PERMS.tenant.list.split(':').slice(0, 2).join(':')}:`;

/**
 * 用例：创建租户（仅平台超管）。
 * 同时为新租户播种「租户管理员」角色（含本租户全部业务权限、不含平台级租户管理权限）
 * 与初始管理员账号，保证新租户开箱即用。
 */
@Injectable()
export class CreateTenantUseCase {
  private readonly logger = new Logger(CreateTenantUseCase.name);
  private readonly env = loadEnvConfig();

  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(PERMISSION_REPOSITORY) private readonly permRepo: PermissionRepository,
    private readonly password: PasswordService,
  ) {}

  async execute(payload: CreateTenantPayload): Promise<TenantView> {
    const code = payload.code.trim();
    if (await this.tenantRepo.existsByCode(code)) {
      throw new ConflictException('租户编码已存在');
    }

    const tenant = await this.tenantRepo.save(
      this.tenantRepo.create({
        code,
        name: payload.name.trim(),
        status: TenantStatus.Enabled,
        remark: payload.remark ?? '',
        builtin: false,
      }),
    );

    const adminRole = await this.seedTenantAdminRole(tenant.id);
    await this.seedTenantAdminUser(tenant.id, code, adminRole.id, payload);

    this.logger.log(`已创建租户 [${code}] 并播种租户管理员角色与账号`);
    return toTenantView(tenant);
  }

  /** 为新租户创建「租户管理员」角色并授予本租户全部业务权限（排除平台级租户管理权限） */
  private async seedTenantAdminRole(tenantId: string) {
    const allPerms = await this.permRepo.findAll();
    const grantable = allPerms.filter((p) => !p.code.startsWith(PLATFORM_ONLY_PREFIX));
    const role = this.roleRepo.create({
      code: TENANT_ADMIN_ROLE,
      name: '租户管理员',
      remark: '内置角色，拥有本租户全部权限',
      tenantId,
      permissions: grantable,
    });
    return this.roleRepo.save(role);
  }

  /** 为新租户创建初始管理员账号并绑定租户管理员角色 */
  private async seedTenantAdminUser(
    tenantId: string,
    code: string,
    roleId: string,
    payload: CreateTenantPayload,
  ): Promise<void> {
    const username = payload.adminUsername?.trim() || `${code}_admin`;
    const rawPassword = payload.adminPassword?.trim() || this.env.seed.adminPassword;
    const role = await this.roleRepo.findById(roleId);
    const user = this.userRepo.create({
      username,
      passwordHash: await this.password.hash(rawPassword),
      nickname: '租户管理员',
      tenantId,
      roles: role ? [role] : [],
    });
    await this.userRepo.save(user);
  }
}
