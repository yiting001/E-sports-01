import { Controller, Get, Query } from '@nestjs/common';
import { FeedbackView, PaginatedResult } from '@app/contracts';
import { ListMyFeedbackUseCase } from '../../application/use-cases/list-my-feedback.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/**
 * 路由：分页查询当前用户自己的反馈（GET /feedback/mine）。
 * 仅登录态，所有角色可用。
 */
@Controller('feedback')
export class FeedbackMineController {
  constructor(private readonly useCase: ListMyFeedbackUseCase) {}

  @Get('mine')
  mine(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<FeedbackView>> {
    return this.useCase.execute(
      user.id,
      query.page,
      query.pageSize,
      query.skip,
    );
  }
}
