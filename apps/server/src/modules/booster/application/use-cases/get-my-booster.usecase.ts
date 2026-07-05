import { Inject, Injectable } from '@nestjs/common';
import { BoosterMineView, BoosterStatus } from '@app/contracts';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import {
  BOOSTER_REPOSITORY,
  BoosterRepository,
} from '../../domain/booster-repository.interface';
import { toBoosterView } from '../booster.mapper';

/** 用例：获取当前用户打手入驻概览（未提交为 none，否则返回记录与状态） */
@Injectable()
export class GetMyBoosterUseCase {
  constructor(
    @Inject(BOOSTER_REPOSITORY)
    private readonly repo: BoosterRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(userId: string): Promise<BoosterMineView> {
    const record = await this.repo.findByUserId(userId);
    if (!record) {
      return { status: BoosterStatus.None, record: null };
    }
    const profiles = await this.users.resolveProfiles([userId]);
    return {
      status: record.status,
      record: toBoosterView(record, profiles.get(userId)),
    };
  }
}
