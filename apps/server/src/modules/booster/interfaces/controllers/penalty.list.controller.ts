import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, PenaltyView, PERMS } from '@app/contracts';
import { ListPenaltiesUseCase } from '../../application/use-cases/list-penalties.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PenaltyListQueryDto } from '../dto/penalty-list-query.dto';

/**
 * 路由：分页查询罚款记录（GET /finance/penalties），可按打手过滤。
 * 需 finance:penalty:list 权限。
 */
@Controller('finance/penalties')
export class PenaltyListController {
  constructor(private readonly useCase: ListPenaltiesUseCase) {}

  @Get()
  @Permissions(PERMS.finance.penaltyList)
  list(
    @Query() query: PenaltyListQueryDto,
  ): Promise<PaginatedResult<PenaltyView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.boosterUserId,
    );
  }
}
