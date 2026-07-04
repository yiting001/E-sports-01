import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NoticePublicView } from '@app/contracts';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';
import { toNoticePublicView } from '../notice.mapper';

/** 用例：C 端查看单条通知详情（仅启用中的通知可见） */
@Injectable()
export class GetPublicNoticeUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(id: string): Promise<NoticePublicView> {
    const entity = await this.repo.findById(id);
    if (!entity || !entity.enabled) {
      throw new NotFoundException('通知不存在或已下线');
    }
    return toNoticePublicView(entity);
  }
}
