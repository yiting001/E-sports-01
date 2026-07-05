import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, PERMS, ServiceAgentOption } from '@app/contracts';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { ListBoosterCandidatesUseCase } from '../../application/use-cases/list-booster-candidates.usecase';

/**
 * 路由：分页查询可被指派的平台打手候选（GET /order/admin/booster-candidates）。
 * 供管理端「指派打手」选择器使用，需 order:admin:assign 权限。
 */
@Controller('order')
export class OrderAdminBoosterCandidatesController {
  constructor(private readonly useCase: ListBoosterCandidatesUseCase) {}

  @Get('admin/booster-candidates')
  @Permissions(PERMS.order.assign)
  list(
    @Query() query: PaginationQueryDto,
    @Query('keyword') keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip, keyword);
  }
}
