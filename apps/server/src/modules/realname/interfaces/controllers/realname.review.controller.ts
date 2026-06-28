import { Body, Controller, Param, Post } from '@nestjs/common';
import { PERMS, RealnameView } from '@app/contracts';
import { ReviewRealnameUseCase } from '../../application/use-cases/review-realname.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { ReviewRealnameDto } from '../dto/review-realname.dto';

/**
 * 路由：审核实名认证（POST /realname/:id/review）。
 * 需 realname:review 权限。
 */
@Controller('realname')
export class RealnameReviewController {
  constructor(private readonly useCase: ReviewRealnameUseCase) {}

  @Post(':id/review')
  @Permissions(PERMS.realname.review)
  review(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewRealnameDto,
  ): Promise<RealnameView> {
    return this.useCase.execute(user.id, id, dto);
  }
}
