import { Body, Controller, Param, Put } from '@nestjs/common';
import { NoticeView, PERMS } from '@app/contracts';
import { SaveNoticeUseCase } from '../../application/use-cases/save-notice.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertNoticeDto } from '../dto/upsert-notice.dto';

/**
 * 路由：编辑通知（PUT /notice/:id）。
 * 需 notice:save 权限。
 */
@Controller('notice')
export class NoticeUpdateController {
  constructor(private readonly useCase: SaveNoticeUseCase) {}

  @Put(':id')
  @Permissions(PERMS.notice.save)
  update(
    @Param('id') id: string,
    @Body() dto: UpsertNoticeDto,
  ): Promise<NoticeView> {
    return this.useCase.execute(dto, id);
  }
}
