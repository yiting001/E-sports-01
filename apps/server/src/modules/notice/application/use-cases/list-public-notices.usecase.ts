import { Inject, Injectable } from '@nestjs/common';
import { NoticePublicView } from '@app/contracts';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';
import { toNoticePublicView } from '../notice.mapper';

/** 用例：C 端查询启用中的通知（公告条滚动 + 通知列表页共用） */
@Injectable()
export class ListPublicNoticesUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(): Promise<NoticePublicView[]> {
    const rows = await this.repo.findEnabled();
    return rows.map(toNoticePublicView);
  }
}
