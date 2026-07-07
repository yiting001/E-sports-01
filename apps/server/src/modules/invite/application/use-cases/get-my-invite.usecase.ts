import { Inject, Injectable } from '@nestjs/common';
import { InviteRecordView, MyInviteView } from '@app/contracts';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/invite-repository.interface';
import { UserDirectory } from '../../../rbac/application/user-directory.service';
import { InviteCodeService } from '../invite-code.service';
import { InviteConfigService } from '../invite-config.service';

/**
 * 用例：C 端我的邀请。
 * 返回我的邀请码（首次访问惰性生成）、是否已绑定邀请人、
 * 当前双方可得奖励说明与我的邀请记录（被邀请人昵称 + 奖励快照）。
 */
@Injectable()
export class GetMyInviteUseCase {
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly repo: InviteRepository,
    private readonly codeService: InviteCodeService,
    private readonly configService: InviteConfigService,
    private readonly users: UserDirectory,
  ) {}

  async execute(userId: string): Promise<MyInviteView> {
    const [code, boundRecord, config, records] = await Promise.all([
      this.codeService.getOrCreate(userId),
      this.repo.findRecordByInvitee(userId),
      this.configService.get(),
      this.repo.listByInviter(userId),
    ]);
    const [inviterRewardText, inviteeRewardText] = await Promise.all([
      this.configService.describe(config.inviter),
      this.configService.describe(config.invitee),
    ]);
    const profiles = await this.users.resolveProfiles(
      records.map((r) => r.inviteeId),
    );
    const views: InviteRecordView[] = records.map((r) => {
      const profile = profiles.get(r.inviteeId);
      return {
        id: r.id,
        inviteeName: profile?.nickname || profile?.username || '已注销用户',
        inviterRewardText: r.inviterRewardText,
        createdAt: r.createdAt.toISOString(),
      };
    });
    return {
      code,
      bound: Boolean(boundRecord),
      inviterRewardText,
      inviteeRewardText,
      records: views,
    };
  }
}
