import {
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DEFAULT_TENANT_CODE, TenantStatus } from '@app/contracts';
import { TenantEntity } from '../domain/tenant.entity';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../domain/tenant-repository.interface';

/**
 * 租户解析服务。
 * 在登录/注册等公开路由把租户编码解析为租户主键，并校验租户启用状态；
 * 同时为映射层提供 id→编码 的查询，集中收敛租户相关的解析逻辑。
 */
@Injectable()
export class TenantResolver {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
  ) {}

  /**
   * 登录用：把可选租户编码解析为租户 id。
   * 编码为空时返回 undefined（按全局解析，兼容单租户/默认租户）。
   */
  async resolveOptionalId(code?: string): Promise<string | undefined> {
    const trimmed = code?.trim();
    if (!trimmed) {
      return undefined;
    }
    const tenant = await this.tenantRepo.findByCode(trimmed);
    if (!tenant || tenant.status !== TenantStatus.Enabled) {
      throw new UnauthorizedException('租户不存在或已停用');
    }
    return tenant.id;
  }

  /**
   * 注册用：把可选租户编码解析为目标租户 id。
   * 编码为空时落到默认租户；指定编码必须存在且启用。
   */
  async resolveForWrite(code?: string): Promise<string> {
    const trimmed = code?.trim();
    const tenant = trimmed
      ? await this.tenantRepo.findByCode(trimmed)
      : await this.tenantRepo.findByCode(DEFAULT_TENANT_CODE);
    if (!tenant || tenant.status !== TenantStatus.Enabled) {
      throw new UnauthorizedException('租户不存在或已停用');
    }
    return tenant.id;
  }

  /** 校验指定租户处于启用状态，否则拒绝登录 */
  async assertTenantEnabled(tenantId: string): Promise<void> {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (tenant && tenant.status !== TenantStatus.Enabled) {
      throw new UnauthorizedException('所属租户已停用');
    }
  }

  /** 取单个租户（用于个人资料展示） */
  findById(tenantId: string): Promise<TenantEntity | null> {
    return this.tenantRepo.findById(tenantId);
  }

  /** 批量取 id→编码 映射（用于列表展示归属租户） */
  async codeMap(tenantIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(tenantIds)];
    const tenants = await this.tenantRepo.findByIds(unique);
    return new Map(tenants.map((t) => [t.id, t.code]));
  }
}
