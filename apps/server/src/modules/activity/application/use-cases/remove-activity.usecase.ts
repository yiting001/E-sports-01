import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/activity-repository.interface';

/** 用例：删除活动 */
@Injectable()
export class RemoveActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repo: ActivityRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('活动不存在');
    }
    await this.repo.remove(entity);
  }
}
