import { Controller, Get, Param } from '@nestjs/common';
import { NoticePublicView } from '@app/contracts';
import { GetPublicNoticeUseCase } from '../../application/use-cases/get-public-notice.usecase';
import { TenantPublic } from '../../../rbac/interfaces/auth/tenant-public.decorator';

/** 路由：C 端查看单条通知详情（GET /notice/public/:id），免登录只读 */
@Controller('notice/public')
export class NoticePublicDetailController {
  constructor(private readonly useCase: GetPublicNoticeUseCase) {}

  @Get(':id')
  @TenantPublic()
  detail(@Param('id') id: string): Promise<NoticePublicView> {
    return this.useCase.execute(id);
  }
}
