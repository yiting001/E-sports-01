import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { UserView } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
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
import { UserStatus } from '../../domain/user.entity';
import { PasswordService } from '../../infrastructure/password.service';
import { toUserView } from '../user.mapper';

/** 创建用户入参 */
export interface CreateUserInput {
  username: string;
  password: string;
  nickname?: string;
  phone?: string;
  status?: UserStatus;
  roleIds?: string[];
  /** 所属租户主键；仅平台超管可指定，缺省为当前请求租户 */
  tenantId?: string;
}

/** 用例：管理员创建用户（可选择所属租户并同时分配该租户下的角色） */
@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roleRepo: RoleRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
    private readonly tenant: TenantContextService,
    private readonly password: PasswordService,
  ) {}

  async execute(input: CreateUserInput): Promise<UserView> {
    const tenantId = await this.resolveTenantId(input.tenantId);
    if (await this.userRepo.existsByUsername(input.username, tenantId)) {
      throw new ConflictException('用户名已存在');
    }
    const phone = input.phone ?? '';
    if (phone && (await this.userRepo.existsByPhone(phone, undefined, tenantId))) {
      throw new ConflictException('手机号已被其他用户绑定');
    }
    const roles = await this.resolveRoles(input.roleIds, tenantId);
    const entity = this.userRepo.create({
      username: input.username,
      passwordHash: await this.password.hash(input.password),
      nickname: input.nickname ?? input.username,
      phone,
      status: input.status ?? UserStatus.Enabled,
      roles,
      tenantId,
    });
    return toUserView(await this.userRepo.save(entity));
  }

  /** 解析归属租户：显式指定仅超管可用且须为启用租户；缺省取当前请求租户 */
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

  /** 解析待绑定角色，并校验全部属于目标租户 */
  private async resolveRoles(roleIds: string[] | undefined, tenantId?: string) {
    const requested = [...new Set(roleIds ?? [])];
    if (requested.length === 0) {
      return [];
    }
    const roles = await this.roleRepo.findByIds(requested);
    if (roles.length !== requested.length) {
      throw new BadRequestException('部分角色不存在');
    }
    if (tenantId && roles.some((role) => role.tenantId !== tenantId)) {
      throw new ForbiddenException('不能为用户绑定其他租户的角色');
    }
    return roles;
  }
}
