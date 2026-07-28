import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  BOOSTER_ROLE_CODE,
  CreateTenantPayload,
  TENANT_ADMIN_PASSWORD_MAX_LENGTH,
  TENANT_ADMIN_PASSWORD_MIN_LENGTH,
  TENANT_ADMIN_PASSWORD_PATTERN,
  TenantStatus,
  TenantView,
} from '@app/contracts';
import {
  MEMBER_ROLE,
  isPlatformOnlyPermission,
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  TENANT_ADMIN_ROLE,
} from '../../domain/rbac.constants';
import { Permission } from '../../domain/permission.entity';
import { Role } from '../../domain/role.entity';
import {
  TENANT_PROVISIONING_TRANSACTION,
  TenantProvisioningRepositories,
  TenantProvisioningTransaction,
} from '../../domain/tenant-provisioning-transaction.interface';
import { PasswordService } from '../../infrastructure/password.service';
import { toTenantView } from '../tenant.mapper';

/**
 * 用例：创建租户（仅平台超管）。
 * 同时为新租户播种「租户管理员」角色（不含平台目录与全局规则写权限）
 * 与初始管理员账号，保证新租户开箱即用。
 */
@Injectable()
export class CreateTenantUseCase {
  private readonly logger = new Logger(CreateTenantUseCase.name);

  constructor(
    @Inject(TENANT_PROVISIONING_TRANSACTION)
    private readonly provisioning: TenantProvisioningTransaction,
    @Inject(PasswordService)
    private readonly password: Pick<PasswordService, 'hash'>,
  ) {}

  async execute(payload: CreateTenantPayload): Promise<TenantView> {
    const { adminPassword } = payload;
    if (
      adminPassword.length < TENANT_ADMIN_PASSWORD_MIN_LENGTH ||
      adminPassword.length > TENANT_ADMIN_PASSWORD_MAX_LENGTH ||
      !TENANT_ADMIN_PASSWORD_PATTERN.test(adminPassword)
    ) {
      throw new BadRequestException('管理员密码必须为 12-128 位，并包含大小写字母、数字和特殊字符');
    }
    const code = payload.code.trim();
    const passwordHash = await this.password.hash(adminPassword);
    try {
      const tenant = await this.provisioning.run(async (repositories) => {
        if (await repositories.tenants.existsByCode(code)) {
          throw new ConflictException('租户编码已存在');
        }
        const savedTenant = await repositories.tenants.save(
          repositories.tenants.create({
            code,
            name: payload.name.trim(),
            status: TenantStatus.Enabled,
            remark: payload.remark ?? '',
            builtin: false,
          }),
        );
        const adminRole = await this.seedTenantRoles(repositories, savedTenant.id);
        await this.seedTenantAdminUser(
          repositories,
          savedTenant.id,
          code,
          adminRole,
          payload,
          passwordHash,
        );
        return savedTenant;
      });
      this.logger.log(`已创建租户 [${code}] 并播种租户管理员角色与账号`);
      return toTenantView(tenant);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (isUniqueViolation(error)) {
        throw new ConflictException('租户编码已存在');
      }
      throw error;
    }
  }

  /** 创建租户管理员、会员、客服和打手四类基础角色。 */
  private async seedTenantRoles(
    repositories: TenantProvisioningRepositories,
    tenantId: string,
  ): Promise<Role> {
    const allPerms = await repositories.permissions.findAll();
    const grantable = allPerms.filter((permission) => !isPlatformOnlyPermission(permission.code));
    const permissionsByCode = new Map(allPerms.map((permission) => [permission.code, permission]));
    const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map((code) =>
      permissionsByCode.get(code),
    ).filter((permission): permission is Permission => permission !== undefined);
    const adminRole = await repositories.roles.save(
      repositories.roles.create({
        code: TENANT_ADMIN_ROLE,
        name: '租户管理员',
        remark: '内置角色，拥有本租户业务权限',
        tenantId,
        permissions: grantable,
      }),
    );
    await repositories.roles.save(
      repositories.roles.create({
        code: MEMBER_ROLE,
        name: '普通用户',
        remark: '内置角色，短信自助注册用户默认角色',
        tenantId,
        permissions: [],
      }),
    );
    await repositories.roles.save(
      repositories.roles.create({
        code: SERVICE_ROLE,
        name: '客服',
        remark: '内置角色，负责接待用户咨询和处理订单',
        tenantId,
        permissions: servicePermissions,
      }),
    );
    await repositories.roles.save(
      repositories.roles.create({
        code: BOOSTER_ROLE_CODE,
        name: '打手',
        remark: '内置角色，打手入驻申请审核通过后自动授予',
        tenantId,
        permissions: [],
      }),
    );
    return adminRole;
  }

  /** 为新租户创建初始管理员账号并绑定租户管理员角色 */
  private async seedTenantAdminUser(
    repositories: TenantProvisioningRepositories,
    tenantId: string,
    code: string,
    adminRole: Role,
    payload: CreateTenantPayload,
    passwordHash: string,
  ): Promise<void> {
    const username = payload.adminUsername?.trim() || `${code}_admin`;
    const user = repositories.users.create({
      username,
      passwordHash,
      nickname: '租户管理员',
      tenantId,
      roles: [adminRole],
    });
    await repositories.users.save(user);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
