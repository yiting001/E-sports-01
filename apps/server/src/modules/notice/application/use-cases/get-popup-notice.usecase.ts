import { Inject, Injectable } from '@nestjs/common';
import { NoticePopupView } from '@app/contracts';
import { NOTICE_REPOSITORY, NoticeRepository } from '../../domain/notice-repository.interface';
import { toNoticePopupView } from '../notice.mapper';

/**
 * 用例：C 端首次进入取本租户最新一条弹窗公告。
 * 接口由 TenantPublic 守卫建立租户上下文，仓储据此执行行级过滤。
 */
@Injectable()
export class GetPopupNoticeUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(): Promise<NoticePopupView | null> {
    const entity = await this.repo.findLatestPopup();
    return entity ? toNoticePopupView(entity) : null;
  }
}
