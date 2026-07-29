import { Controller, Get } from '@nestjs/common';
import { NoticePopupView } from '@app/contracts';
import { GetPopupNoticeUseCase } from '../../application/use-cases/get-popup-notice.usecase';
import { TenantPublic } from '../../../rbac/interfaces/auth/tenant-public.decorator';

/** 路由：C 端首次进入取弹窗公告（GET /notice/popup），免登录只读，无公告返回 null */
@Controller('notice/popup')
export class NoticePopupController {
  constructor(private readonly useCase: GetPopupNoticeUseCase) {}

  @Get()
  @TenantPublic()
  popup(): Promise<NoticePopupView | null> {
    return this.useCase.execute();
  }
}
