import { Body, Controller, Param, Post } from '@nestjs/common';
import { BoosterView, PERMS } from '@app/contracts';
import { ReviewBoosterUseCase } from '../../application/use-cases/review-booster.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ReviewBoosterDto } from '../dto/review-booster.dto';

/**
 * 路由：审核打手入驻申请（POST /booster/:id/review）。
 * 需 booster:review 权限；通过时自动授予申请人 booster 角色。
 */
@Controller('booster')
export class BoosterReviewController {
  constructor(private readonly useCase: ReviewBoosterUseCase) {}

  @Post(':id/review')
  @Permissions(PERMS.booster.review)
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewBoosterDto,
  ): Promise<BoosterView> {
    return this.useCase.execute(user.id, id, dto);
  }
}
