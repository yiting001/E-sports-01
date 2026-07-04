import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { NoticeView, UpsertNoticePayload } from '@app/contracts';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';
import { toNoticeView } from '../notice.mapper';

/** 用例：新建/编辑通知（id 为空则新建，否则更新） */
@Injectable()
export class SaveNoticeUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(payload: UpsertNoticePayload, id?: string): Promise<NoticeView> {
    if (!id) {
      const created = this.repo.create({ ...payload });
      return toNoticeView(await this.repo.save(created));
    }
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('通知不存在');
    }
    Object.assign(entity, payload);
    return toNoticeView(await this.repo.save(entity));
  }
}
