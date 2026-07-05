import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ActivityPublicView } from '@app/contracts';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/activity-repository.interface';
import { toActivityPublicView } from '../activity.mapper';

/** 用例：C 端查看活动详情（仅启用中的活动可见） */
@Injectable()
export class GetPublicActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repo: ActivityRepository,
  ) {}

  async execute(id: string): Promise<ActivityPublicView> {
    const entity = await this.repo.findById(id);
    if (!entity || !entity.enabled) {
      throw new NotFoundException('活动不存在或已下架');
    }
    return toActivityPublicView(entity);
  }
}
