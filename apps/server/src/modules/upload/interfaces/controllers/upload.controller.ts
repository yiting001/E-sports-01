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
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/** 路由：上传单个文件（multipart/form-data，字段名 file） */
@Controller('upload')
export class UploadController {
  constructor(private readonly useCase: UploadFileUseCase) {}

  @Post()
  @Permissions(PERMS.file.upload)
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
