import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { RemoveFileUseCase } from '../../application/use-cases/remove-file.usecase';
import { PERMS } from '../../../rbac/domain/permission-codes';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/** 路由：删除文件（同时删除存储对象与元数据） */
@Controller('upload/files')
export class FileRemoveController {
  constructor(private readonly useCase: RemoveFileUseCase) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.file.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
