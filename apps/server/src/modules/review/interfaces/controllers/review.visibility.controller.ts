import { Body, Controller, Param, Post } from '@nestjs/common';
import { AdminReviewView, PERMS } from '@app/contracts';
import { SetReviewVisibilityUseCase } from '../../application/use-cases/set-review-visibility.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { SetReviewVisibilityDto } from '../dto/set-review-visibility.dto';

/**
 * 路由：隐藏/恢复评论（POST /review/:id/visibility）。
 * 需 review:admin:moderate 权限；隐藏后不在商品详情页露出。
 */
@Controller('review')
export class ReviewVisibilityController {
  constructor(private readonly useCase: SetReviewVisibilityUseCase) {}

  @Post(':id/visibility')
  @Permissions(PERMS.review.moderate)
  setVisibility(
    @Param('id') id: string,
    @Body() dto: SetReviewVisibilityDto,
  ): Promise<AdminReviewView> {
    return this.useCase.execute(id, dto.visible);
  }
}
