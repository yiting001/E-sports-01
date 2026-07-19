import { BoosterView, PERMS } from '@app/contracts';
import { Controller, Delete, Param } from '@nestjs/common';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateMyBoosterVoiceUseCase } from '../../application/use-cases/update-my-booster-voice.usecase';

@Controller('booster')
export class BoosterVoiceRemoveController {
  constructor(private readonly useCase: UpdateMyBoosterVoiceUseCase) {}

  @Delete(':id/voice')
  @Permissions(PERMS.booster.update)
  clear(@Param('id') id: string): Promise<BoosterView> {
    return this.useCase.clearById(id);
  }
}
