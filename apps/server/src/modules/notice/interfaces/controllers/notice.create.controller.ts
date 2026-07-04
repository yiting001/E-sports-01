import { Body, Controller, Post } from '@nestjs/common';
import { NoticeView, PERMS } from '@app/contracts';
import { SaveNoticeUseCase } from '../../application/use-cases/save-notice.usecase';
import { Permissions } from '../../../rbac/interfaces/auth/permissions.decorator';
import { UpsertNoticeDto } from '../dto/upsert-notice.dto';

/**
 * 路由：新建通知（POST /notice）。
 * 需 notice:save 权限。
 */
@Controller('notice')
export class NoticeCreateController {
  constructor(private readonly useCase: SaveNoticeUseCase) {}

  @Post()
  @Permissions(PERMS.notice.save)
  create(@Body() dto: UpsertNoticeDto): Promise<NoticeView> {
    return this.useCase.execute(dto);
  }
}
