import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, UserView } from '@app/contracts';
import { ListUsersUseCase } from '../../application/use-cases/list-users.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';

/** 路由：分页查询用户列表 */
@Controller('rbac/users')
export class UserListController {
  constructor(private readonly useCase: ListUsersUseCase) {}

  @Get()
  @Permissions(PERMS.user.list)
  list(@Query() query: ListUsersQueryDto): Promise<PaginatedResult<UserView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, {
      keyword: query.keyword,
      status: query.status,
      roleId: query.roleId,
    });
  }
}
