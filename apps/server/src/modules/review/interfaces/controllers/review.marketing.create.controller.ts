import { Body, Controller, Post } from '@nestjs/common';
import { AdminReviewView, PERMS } from '@app/contracts';
import { CreateMarketingReviewUseCase } from '../../application/use-cases/create-marketing-review.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CreateMarketingReviewDto } from '../dto/create-marketing-review.dto';

/**
 * 路由：营销工具——为商品添加自定义评论（POST /review/marketing）。
 * 需 review:admin:marketing 权限；昵称/头像自定义，无订单来源。
 */
@Controller('review')
export class ReviewMarketingCreateController {
  constructor(private readonly useCase: CreateMarketingReviewUseCase) {}

  @Post('marketing')
  @Permissions(PERMS.review.marketing)
  create(@Body() dto: CreateMarketingReviewDto): Promise<AdminReviewView> {
    return this.useCase.execute(dto);
  }
}
