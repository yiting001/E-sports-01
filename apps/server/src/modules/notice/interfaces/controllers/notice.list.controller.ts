import { Controller, Get, Query } from '@nestjs/common';
import { NoticeView, PaginatedResult, PERMS } from '@app/contracts';
import { ListNoticesUseCase } from '../../application/use-cases/list-notices.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/**
 * 路由：管理端分页查询通知列表（GET /notice）。
 * 需 notice:list 权限。
 */
@Controller('notice')
export class NoticeListController {
  constructor(private readonly useCase: ListNoticesUseCase) {}

  @Get()
  @Permissions(PERMS.notice.list)
  list(@Query() query: PaginationQueryDto): Promise<PaginatedResult<NoticeView>> {
    return this.useCase.execute(query.page, query.pageSize, query.skip);
  }
}
