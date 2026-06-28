import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult, UserView } from '@app/contracts';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../domain/user-repository.interface';
import { TenantResolver } from '../tenant-resolver.service';
import { toUserView } from '../user.mapper';

/** 用例：分页查询用户列表（平台超管跨租户时回填归属租户编码） */
@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    private readonly tenants: TenantResolver,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
    keyword?: string,
  ): Promise<PaginatedResult<UserView>> {
    const [rows, total] = await this.userRepo.paginate(skip, pageSize, keyword);
    const codeMap = await this.tenants.codeMap(rows.map((u) => u.tenantId));
    return {
      list: rows.map((u) => toUserView(u, codeMap.get(u.tenantId) ?? '')),
      total,
      page,
      pageSize,
    };
  }
}
