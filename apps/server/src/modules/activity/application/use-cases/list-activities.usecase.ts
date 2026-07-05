import { Inject, Injectable } from '@nestjs/common';
import { ActivityView, PaginatedResult } from '@app/contracts';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/activity-repository.interface';
import { toActivityView } from '../activity.mapper';

/** 用例：管理端分页查询活动列表 */
@Injectable()
export class ListActivitiesUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repo: ActivityRepository,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<ActivityView>> {
    const [rows, total] = await this.repo.paginate(skip, pageSize);
    return { list: rows.map(toActivityView), total, page, pageSize };
  }
}
