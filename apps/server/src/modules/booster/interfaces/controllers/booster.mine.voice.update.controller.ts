import {
  BadRequestException,
  Controller,
  Put,
  UploadedFile as UploadedFileParam,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BOOSTER_VOICE_LIMITS, BoosterView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { UpdateMyBoosterVoiceUseCase } from '../../application/use-cases/update-my-booster-voice.usecase';

@Controller('booster')
export class BoosterMineVoiceUpdateController {
  constructor(private readonly useCase: UpdateMyBoosterVoiceUseCase) {}

  @Put('mine/voice')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: BOOSTER_VOICE_LIMITS.maxSizeBytes },
    }),
  )
  upload(
    @UploadedFileParam() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<BoosterView> {
    if (!file) {
      throw new BadRequestException('请通过 file 字段上传语音');
    }
    return this.useCase.upload(user.id, {
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });
  }
}
