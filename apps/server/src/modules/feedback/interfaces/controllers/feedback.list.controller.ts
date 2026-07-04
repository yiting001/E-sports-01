import { Controller, Get, Query } from '@nestjs/common';
import { FeedbackView, PaginatedResult, PERMS } from '@app/contracts';
import { ListFeedbackUseCase } from '../../application/use-cases/list-feedback.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { FeedbackListQueryDto } from '../dto/feedback-list-query.dto';

/**
 * 路由：管理端分页查询反馈列表（GET /feedback），可按状态/类型过滤。
 * 需 feedback:list 权限。
 */
@Controller('feedback')
export class FeedbackListController {
  constructor(private readonly useCase: ListFeedbackUseCase) {}

  @Get()
  @Permissions(PERMS.feedback.list)
  list(
    @Query() query: FeedbackListQueryDto,
  ): Promise<PaginatedResult<FeedbackView>> {
    return this.useCase.execute(
      query.page,
      query.pageSize,
      query.skip,
      query.status,
      query.type,
    );
  }
}
