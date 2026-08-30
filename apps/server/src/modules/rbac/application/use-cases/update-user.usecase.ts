import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserView } from '@app/contracts';
import { TenantContextService } from '../../../../shared/tenant/tenant-context.service';
import { SUPER_ADMIN_ROLE } from '../../domain/rbac.constants';
import {
  TENANT_REPOSITORY,
  TenantRepository,
} from '../../domain/tenant-repository.interface';
import { USER_REPOSITORY, UserRepository } from '../../domain/user-repository.interface';
import { User, UserStatus } from '../../domain/user.entity';
import { PasswordService } from '../../infrastructure/password.service';
import { toUserView } from '../user.mapper';
import { PermissionResolver } from '../permission-resolver.service';

/** 更新用户入参（均为可选，按需更新） */
export interface UpdateUserInput {
  nickname?: string;
  phone?: string;
  status?: UserStatus;
  password?: string;
  /** 目标所属租户主键；仅平台超管可变更，变更后自动解绑原租户角色 */
  tenantId?: string;
}

/** 用例：更新用户基础信息/状态/口令 */
@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(TENANT_REPOSITORY) private readonly tenantRepo: TenantRepository,
    private readonly password: PasswordService,
    private readonly permissions: PermissionResolver,
    private readonly tenant: TenantContextService,
  ) {}

  async execute(id: string, input: UpdateUserInput): Promise<UserView> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (input.tenantId !== undefined && input.tenantId !== user.tenantId) {
      await this.changeTenant(user, input.tenantId);
    }
    if (input.nickname !== undefined) {
      user.nickname = input.nickname;
    }
    if (input.phone !== undefined) {
      if (input.phone && (await this.userRepo.existsByPhone(input.phone, id))) {
        throw new ConflictException('手机号已被其他用户绑定');
      }
      user.phone = input.phone;
    }
    if (input.status !== undefined) {
      user.status = input.status;
    }
    if (input.password) {
      user.passwordHash = await this.password.hash(input.password);
    }
    const saved = await this.userRepo.save(user);
    await this.permissions.invalidate(id);
    return toUserView(saved);
  }

  /** 变更用户所属租户：仅平台超管；校验目标租户与唯一性，并解绑原租户角色 */
  private async changeTenant(user: User, targetTenantId: string): Promise<void> {
    if (!this.tenant.isSuper) {
      throw new ForbiddenException('仅平台超管可变更用户所属租户');
    }
    if ((user.roles ?? []).some((role) => role.code === SUPER_ADMIN_ROLE)) {
      throw new ForbiddenException('平台超管账号不可变更所属租户');
    }
    if (!(await this.tenantRepo.findById(targetTenantId))) {
      throw new BadRequestException('目标租户不存在');
    }
    if (await this.userRepo.existsByUsername(user.username, targetTenantId)) {
      throw new ConflictException('用户名在目标租户已存在');
    }
    if (
      user.phone &&
      (await this.userRepo.existsByPhone(user.phone, user.id, targetTenantId))
    ) {
      throw new ConflictException('手机号已被目标租户其他用户绑定');
    }
    user.tenantId = targetTenantId;
    user.roles = [];
  }
}
