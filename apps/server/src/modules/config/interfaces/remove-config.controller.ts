import { Controller, Delete, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { PERMS } from '../../rbac/domain/permission-codes';
import { Permissions } from '../../rbac/interfaces/auth/permissions.decorator';
import { RemoveConfigUseCase } from '../application/use-cases/remove-config.usecase';

/** 路由：删除配置项 */
@Controller('config')
export class RemoveConfigController {
  constructor(private readonly useCase: RemoveConfigUseCase) {}

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Permissions(PERMS.config.remove)
  remove(@Param('key') key: string): Promise<void> {
    return this.useCase.execute(key);
  }
}
