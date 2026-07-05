import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityView, UpsertActivityPayload } from '@app/contracts';
import {
  ACTIVITY_REPOSITORY,
  ActivityRepository,
} from '../../domain/activity-repository.interface';
import { toActivityView } from '../activity.mapper';

/** 用例：新建/编辑活动（id 为空则新建，否则更新） */
@Injectable()
export class SaveActivityUseCase {
  constructor(
    @Inject(ACTIVITY_REPOSITORY)
    private readonly repo: ActivityRepository,
  ) {}

  async execute(
    payload: UpsertActivityPayload,
    id?: string,
  ): Promise<ActivityView> {
    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('活动结束须晚于开始');
    }
    const data = { ...payload, startAt, endAt };
    if (!id) {
      const created = this.repo.create(data);
      return toActivityView(await this.repo.save(created));
    }
    const entity = await this.repo.findById(id);
    if (!entity) {
      throw new NotFoundException('活动不存在');
    }
    Object.assign(entity, data);
    return toActivityView(await this.repo.save(entity));
  }
}
