import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { RoleView } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { ROLE_REPOSITORY, RoleRepository } from '../../domain/role-repository.interface';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';
import { toRoleView } from '../role.mapper';

/** 创建角色入参 */
export interface CreateRoleInput {
  code: string;
  name: string;
  remark?: string;
  /** 所属租户主键；仅平台超管可指定，缺省为当前请求租户 */
  tenantId?: string;
}

/** 用例：创建角色（可选择所属租户；编码不要求唯一，同编码角色各自独立授权） */
@Injectable()
export class CreateRoleUseCase {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepo: Pick<RoleRepository, 'create' | 'save'>,
    @Inject(TENANT_REPOSITORY)
    private readonly tenantRepo: Pick<TenantRepository, 'findById'>,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(input: CreateRoleInput): Promise<RoleView> {
    const tenantId = await this.resolveTenantId(input.tenantId);
    const entity = this.roleRepo.create({
      code: input.code,
      name: input.name,
      remark: input.remark ?? '',
      tenantId,
    });
    return toRoleView(await this.roleRepo.save(entity));
  }

  /** 解析归属租户：显式指定仅超管可用且须存在；缺省取当前请求租户 */
  private async resolveTenantId(explicit?: string): Promise<string | undefined> {
    if (!explicit) {
      return this.tenant.tenantId ?? undefined;
    }
    if (!this.tenant.isSuper && explicit !== this.tenant.tenantId) {
      throw new ForbiddenException('仅平台超管可指定其他租户');
    }
    const tenant = await this.tenantRepo.findById(explicit);
    if (!tenant) {
      throw new BadRequestException('所属租户不存在');
    }
    return explicit;
  }
}
