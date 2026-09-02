import { ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { BOOSTER_ROLE_CODE, CreateTenantPayload, TenantStatus, TenantView } from '@app/contracts';
import {
  MEMBER_ROLE,
  SERVICE_ROLE,
  SERVICE_ROLE_PERMISSION_CODES,
  TENANT_ADMIN_ROLE,
  TENANT_ADMIN_ROLE_REMARK,
} from '../../domain/rbac.constants';
import { Permission } from '../../domain/permission.entity';
import { Role } from '../../domain/role.entity';
import {
  TENANT_PROVISIONING_TRANSACTION,
  TenantProvisioningRepositories,
  TenantProvisioningTransaction,
} from '../../domain/tenant-provisioning-transaction.interface';
import { toTenantView } from '../tenant.mapper';

/**
 * 用例：创建租户（仅平台超管）。
 * 仅创建租户并播种四类内置角色；租户管理员角色不预赋任何权限，
 * 具体权限与管理员账号均由平台超管在角色/用户管理中单独授予。
 */
@Injectable()
export class CreateTenantUseCase {
  private readonly logger = new Logger(CreateTenantUseCase.name);

  constructor(
    @Inject(TENANT_PROVISIONING_TRANSACTION)
    private readonly provisioning: TenantProvisioningTransaction,
  ) {}

  async execute(payload: CreateTenantPayload): Promise<TenantView> {
    const code = payload.code.trim();
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
        await this.seedTenantRoles(repositories, savedTenant.id);
        return savedTenant;
      });
      this.logger.log(`已创建租户 [${code}] 并播种四类内置角色`);
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

  /** 创建租户管理员、会员、客服和打手四类基础角色；仅客服带工作台默认权限。 */
  private async seedTenantRoles(
    repositories: TenantProvisioningRepositories,
    tenantId: string,
  ): Promise<Role> {
    const allPerms = await repositories.permissions.findAll();
    const permissionsByCode = new Map(allPerms.map((permission) => [permission.code, permission]));
    const servicePermissions = SERVICE_ROLE_PERMISSION_CODES.map((code) =>
      permissionsByCode.get(code),
    ).filter((permission): permission is Permission => permission !== undefined);
    const adminRole = await repositories.roles.save(
      repositories.roles.create({
        code: TENANT_ADMIN_ROLE,
        name: '租户管理员',
        remark: TENANT_ADMIN_ROLE_REMARK,
        tenantId,
        permissions: [],
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
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
