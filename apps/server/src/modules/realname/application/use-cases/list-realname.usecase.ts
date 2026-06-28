import { Inject, Injectable } from '@nestjs/common';
import {
  PaginatedResult,
  RealnameStatus,
  RealnameView,
} from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  REALNAME_REPOSITORY,
  RealnameRepository,
} from '../../domain/realname-repository.interface';
import { toRealnameView } from '../realname.mapper';

/** 用例：分页查询实名认证记录（管理端审核列表），可按状态过滤 */
@Injectable()
export class ListRealnameUseCase {
  constructor(
    @Inject(REALNAME_REPOSITORY)
    private readonly repo: RealnameRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    status?: RealnameStatus,
  ): Promise<PaginatedResult<RealnameView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize, status);
    const profiles = await this.users.resolveProfiles(
      rows.map((r) => r.userId),
    );
    const list = rows.map((r) => toRealnameView(r, profiles.get(r.userId)));
    return { list, total, page, pageSize };
  }
}
