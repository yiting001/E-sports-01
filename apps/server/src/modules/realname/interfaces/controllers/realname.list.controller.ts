import { Controller, Get, Query } from '@nestjs/common';
import { PaginatedResult, PERMS, RealnameView } from '@app/contracts';
import { ListRealnameUseCase } from '../../application/use-cases/list-realname.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { RealnameListQueryDto } from '../dto/realname-list-query.dto';

/**
 * 路由：分页查询实名审核列表（GET /realname），可按状态过滤。
 * 需 realname:list 权限。
 */
@Controller('realname')
export class RealnameListController {
  constructor(private readonly useCase: ListRealnameUseCase) {}

  @Get()
  @Permissions(PERMS.realname.list)
  list(
    @Query() query: RealnameListQueryDto,
  ): Promise<PaginatedResult<RealnameView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.status,
    );
  }
}
