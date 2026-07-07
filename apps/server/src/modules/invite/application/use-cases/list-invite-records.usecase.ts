import { Inject, Injectable } from '@nestjs/common';
import { InviteRecordAdminView, PaginatedResult } from '@app/contracts';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/invite-repository.interface';
import { UserDirectory } from '../../../rbac/application/user-directory.service';

/**
 * 用例：管理端分页查询邀请记录。
 * 批量解析邀请人/被邀请人展示名，附奖励发放结果快照。
 */
@Injectable()
export class ListInviteRecordsUseCase {
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly repo: InviteRepository,
    private readonly users: UserDirectory,
  ) {}

  async execute(
    page: number,
    pageSize: number,
    skip: number,
  ): Promise<PaginatedResult<InviteRecordAdminView>> {
    const [records, total] = await this.repo.paginateRecords(skip, pageSize);
    const profiles = await this.users.resolveProfiles(
      records.flatMap((r) => [r.inviterId, r.inviteeId]),
    );
    const nameOf = (id: string): string => {
      const profile = profiles.get(id);
      return profile?.nickname || profile?.username || '已注销用户';
    };
    return {
      list: records.map((r) => ({
        id: r.id,
        inviterId: r.inviterId,
        inviterName: nameOf(r.inviterId),
        inviteeId: r.inviteeId,
        inviteeName: nameOf(r.inviteeId),
        inviterRewardText: r.inviterRewardText,
        inviteeRewardText: r.inviteeRewardText,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      page,
      pageSize,
    };
  }
}
