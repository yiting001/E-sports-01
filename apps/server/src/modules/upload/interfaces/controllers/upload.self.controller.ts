import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile as UploadedFileParam,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@app/contracts';
import { UploadFileUseCase } from '../../application/use-cases/upload-file.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/**
 * 路由：登录用户自助上传单个文件（POST /upload/self，字段名 file）。
 * 仅需登录态、无需 upload:file:upload 权限，供个人头像、实名身份证等自助场景使用。
 * 复用 UploadFileUseCase，与管理端上传共享存储驱动与落库逻辑。
 */
@Controller('upload')
export class UploadSelfController {
  constructor(private readonly useCase: UploadFileUseCase) {}

  @Post('self')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFileParam() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<UploadedFile> {
    if (!file) {
      throw new BadRequestException('请通过 file 字段上传文件');
    }
    return this.useCase.execute(
      {
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      },
      user.id,
    );
  }
}
