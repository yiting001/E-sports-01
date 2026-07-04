import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';

/** 用例：删除通知 */
@Injectable()
export class RemoveNoticeUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('通知不存在');
    }
    await this.repo.remove(entity);
  }
}
