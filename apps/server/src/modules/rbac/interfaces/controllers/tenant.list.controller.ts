import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, TenantView } from '@app/contracts';
import { ListTenantsUseCase } from '../../application/use-cases/list-tenants.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { PERMS } from '../../domain/permission-codes';
import { Permissions } from '../auth/permissions.decorator';

/** 路由：分页查询租户列表（仅平台超管） */
@Controller('rbac/tenants')
export class TenantListController {
  constructor(private readonly useCase: ListTenantsUseCase) {}

  @Get()
  @Permissions(PERMS.tenant.list)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<TenantView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
