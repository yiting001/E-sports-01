import { Controller, Get, Query } from '@nestjs/common';
import { BoosterView, PaginatedResult, PERMS } from '@app/contracts';
import { ListBoosterUseCase } from '../../application/use-cases/list-booster.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { BoosterListQueryDto } from '../dto/booster-list-query.dto';

/**
 * 路由：分页查询打手入驻申请（GET /booster），可按状态、名称或注册手机号过滤。
 * 需 booster:list 权限。
 */
@Controller('booster')
export class BoosterListController {
  constructor(private readonly useCase: ListBoosterUseCase) {}

  @Get()
  @Permissions(PERMS.booster.list)
  list(@Query() query: BoosterListQueryDto): Promise<PaginatedResult<BoosterView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.status,
      query.keyword,
    );
  }
}
