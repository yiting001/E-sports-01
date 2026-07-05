import { Inject, Injectable } from '@nestjs/common';
import { ActivityPublicView } from '@app/contracts';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/activity-repository.interface';
import { toActivityPublicView } from '../activity.mapper';

/** 用例：C 端进行中的活动列表 */
@Injectable()
export class ListPublicActivitiesUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repo: ActivityRepository,
  ) {}

  async execute(): Promise<ActivityPublicView[]> {
    const rows = await this.repo.findOngoing(new Date());
    return rows.map(toActivityPublicView);
  }
}
