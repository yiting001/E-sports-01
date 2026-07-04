import { Controller, Delete, Param } from '@nestjs/common';
import { PERMS } from '@app/contracts';
import { RemoveNoticeUseCase } from '../../application/use-cases/remove-notice.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';

/**
 * 路由：删除通知（DELETE /notice/:id）。
 * 需 notice:remove 权限。
 */
@Controller('notice')
export class NoticeRemoveController {
  constructor(private readonly useCase: RemoveNoticeUseCase) {}

  @Delete(':id')
  @Permissions(PERMS.notice.remove)
  remove(@Param('id') id: string): Promise<void> {
    return this.useCase.execute(id);
  }
}
