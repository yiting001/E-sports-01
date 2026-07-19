import {
  BadRequestException,
  Controller,
  Param,
  Put,
  UploadedFile as UploadedFileParam,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BOOSTER_VOICE_LIMITS, BoosterView, PERMS } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpdateMyBoosterVoiceUseCase } from '../../application/use-cases/update-my-booster-voice.usecase';

@Controller('booster')
export class BoosterVoiceUpdateController {
  constructor(private readonly useCase: UpdateMyBoosterVoiceUseCase) {}

  @Put(':id/voice')
  @Permissions(PERMS.booster.update)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: BOOSTER_VOICE_LIMITS.maxSizeBytes },
    }),
  )
  upload(
    @Param('id') id: string,
    @UploadedFileParam() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<BoosterView> {
    if (!file) {
      throw new BadRequestException('请通过 file 字段上传语音');
    }
    return this.useCase.uploadById(id, user.id, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }
}
