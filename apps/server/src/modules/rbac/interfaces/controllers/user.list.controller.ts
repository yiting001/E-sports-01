import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, UserView } from '@app/contracts';
import { ListUsersUseCase } from '../../application/use-cases/list-users.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：分页查询用户列表 */
@Controller('rbac/users')
export class UserListController {
  constructor(private readonly useCase: ListUsersUseCase) {}

  @Get()
  @Permissions(PERMS.user.list)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<UserView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
