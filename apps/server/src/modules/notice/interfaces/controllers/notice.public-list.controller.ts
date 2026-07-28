import { Controller, Get } from '@nestjs/common';
import { NoticePublicView } from '@app/contracts';
import { ListPublicNoticesUseCase } from '../../application/use-cases/list-public-notices.usecase';
import { TenantPublic } from '../../../rbac/interfaces/auth/tenant-public.decorator';

/** 路由：C 端查询启用中的通知（GET /notice/public），免登录只读 */
@Controller('notice/public')
export class NoticePublicListController {
  constructor(private readonly useCase: ListPublicNoticesUseCase) {}

  @Get()
  @TenantPublic()
  list(): Promise<NoticePublicView[]> {
    return this.useCase.execute();
  }
}
