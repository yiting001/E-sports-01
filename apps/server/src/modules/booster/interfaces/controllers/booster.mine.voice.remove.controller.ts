import { Controller, Delete } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { UpdateMyBoosterVoiceUseCase } from '../../application/use-cases/update-my-booster-voice.usecase';

@Controller('booster')
export class BoosterMineVoiceRemoveController {
  constructor(private readonly useCase: UpdateMyBoosterVoiceUseCase) {}

  @Delete('mine/voice')
  clear(@CurrentUser() user: AuthUser): Promise<BoosterView> {
    return this.useCase.clear(user.id);
  }
}
