import { Inject, Injectable } from '@nestjs/common';
import { RealnameMineView, RealnameStatus } from '@app/contracts';
import { PermissionResolver } from '../../../rbac/application/permission-resolver.service';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../../domain/realname-repository.interface';
import { RealnamePolicyService } from '../policy.service';
import { toRealnameView } from '../realname.mapper';

/**
 * 用例：获取当前用户实名认证概览。
 * 聚合「是否被要求实名」（按其角色命中策略）与「当前实名记录状态」。
 */
@Injectable()
export class GetMyRealnameUseCase {
  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
    private readonly policy: RealnamePolicyService,
    private readonly permissions: PermissionResolver,
    private readonly users: UserDirectory,
  ) {}

  async execute(userId: string): Promise<RealnameMineView> {
    const auth = await this.permissions.resolve(userId);
    const required = await this.policy.isRequiredForRoles(auth.roles);
    const record = await this.repo.findByUserId(userId);
    if (!record) {
      return { required, status: RealnameStatus.None, record: null };
    }
    const profiles = await this.users.resolveProfiles([userId]);
    return {
      required,
      status: record.status,
      record: toRealnameView(record, profiles.get(userId)),
    };
  }
}
