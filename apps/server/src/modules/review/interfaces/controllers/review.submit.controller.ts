import { Body, Controller, Post } from '@nestjs/common';
import { AdminReviewView } from '@app/contracts';
import { SubmitReviewUseCase } from '../../application/use-cases/submit-review.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { SubmitReviewDto } from '../dto/submit-review.dto';

/**
 * 路由：提交商品评论（POST /review）。
 * 仅登录态；须为本人已完成订单，一单一评。
 */
@Controller('review')
export class ReviewSubmitController {
  constructor(private readonly useCase: SubmitReviewUseCase) {}

  @Post()
  submit(
    @CurrentUser() user: AuthUser,
    @Body() dto: SubmitReviewDto,
  ): Promise<AdminReviewView> {
    return this.useCase.execute(user.id, dto);
  }
}
