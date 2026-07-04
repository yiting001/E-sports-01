import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, PERMS, ServiceAgentOption } from '@app/contracts';
import { ListServiceAgentsUseCase } from '../../application/use-cases/list-service-agents.usecase';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：分页查询可关联为「负责客服」的候选用户（GET /commerce/service-agents）。
 * 供管理端商品表单选择器使用，需 commerce:product:list 权限。
 */
@Controller('commerce/service-agents')
export class ServiceAgentListController {
  constructor(private readonly useCase: ListServiceAgentsUseCase) {}

  @Get()
  @Permissions(PERMS.product.list)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
