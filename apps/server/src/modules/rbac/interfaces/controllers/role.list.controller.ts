import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, RoleView } from '@app/contracts';
import { ListRolesUseCase } from '../../application/use-cases/list-roles.usecase';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';
import { ListRolesQueryDto } from '../dto/list-roles-query.dto';

/** 路由：分页查询角色列表（支持名称搜索、编码精确筛选、内置/自定义分类） */
@Controller('rbac/roles')
export class RoleListController {
  constructor(private readonly useCase: ListRolesUseCase) {}

  @Get()
  @Permissions(PERMS.role.list)
  list(@Query() query: ListRolesQueryDto): Promise<PaginatedResult<RoleView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, {
      keyword: query.keyword,
      code: query.code,
      kind: query.kind,
    });
  }
}
