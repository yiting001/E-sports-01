import { Inject, Injectable } from '@nestjs/common';
import { NoticeView, PaginatedResult } from '@app/contracts';
import {
  NOTICE_REPOSITORY,
  NoticeRepository,
} from '../../domain/notice-repository.interface';
import { toNoticeView } from '../notice.mapper';

/** 用例：管理端分页查询通知列表 */
@Injectable()
export class ListNoticesUseCase {
  constructor(
    @Inject(NOTICE_REPOSITORY)
    private readonly repo: NoticeRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<NoticeView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize);
    return { list: rows.map(toNoticeView), total, page, pageSize };
  }
}
