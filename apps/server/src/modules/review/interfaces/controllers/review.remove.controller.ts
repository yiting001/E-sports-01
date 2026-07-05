import { Controller, Delete, Param } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveReviewUseCase } from '../../application/use-cases/remove-review.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：删除评论（DELETE /review/:id）。
 * 需 review:admin:remove 权限；硬删除，删除后该订单可重新评价。
 */
@Controller('review')
export class ReviewRemoveController {
  constructor(private readonly useCase: RemoveReviewUseCase) {}

  @Delete(':id')
  @Permissions(PERMS.review.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
