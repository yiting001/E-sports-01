import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_TENANT_ID, NoticePopupView } from '@app/contracts';
import { TenantResolver } from '../../../rbac/application/tenant-resolver.service';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';
import { toNoticePopupView } from '../notice.mapper';

/**
 * 用例：C 端首次进入取本租户最新一条弹窗公告。
 * 该接口免登录，没有租户上下文可依赖，故按显式租户编码解析租户；
 * 编码缺省或未知时落到内置默认租户，避免跨租户下发公告。
 */
@Injectable()
export class GetPopupNoticeUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
    private readonly tenantResolver: TenantResolver,
  ) {}

  async execute(tenantCode?: string): Promise<NoticePopupView | null> {
    const tenantId =
      (await this.tenantResolver.resolveOptionalId(tenantCode)) ?? DEFAULT_TENANT_ID;
    const entity = await this.repo.findLatestPopup(tenantId);
    return entity ? toNoticePopupView(entity) : null;
  }
}
