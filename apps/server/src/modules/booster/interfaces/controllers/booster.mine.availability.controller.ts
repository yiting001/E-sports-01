import { Body, Controller, Put } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { UpdateMyBoosterAvailabilityUseCase } from '../../application/use-cases/update-my-booster-availability.usecase';
import { UpdateBoosterAvailabilityDto } from '../dto/update-booster-availability.dto';

/** 路由：打手本人切换上线/下线（PUT /booster/mine/availability）。 */
@Controller('booster')
export class BoosterMineAvailabilityController {
  constructor(private readonly useCase: UpdateMyBoosterAvailabilityUseCase) {}

  @Put('mine/availability')
  update(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateBoosterAvailabilityDto,
  ): Promise<BoosterView> {
    return this.useCase.execute(user.id, dto);
  }
}
