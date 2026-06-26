import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, RoleView } from '@app/contracts';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：分页查询角色列表 */
@Controller('rbac/roles')
export class RoleListController {
  constructor(private readonly useCase: ListRolesUseCase) {}

  @Get()
  @Permissions(PERMS.role.list)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<RoleView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
