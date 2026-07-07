import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  INVITE_REPOSITORY,
  InviteRepository,
} from '../../domain/invite-repository.interface';
import { InviteConfigService } from '../invite-config.service';
import { InviteRewardService } from '../invite-reward.service';

/**
 * 用例：填码绑定邀请关系。
 * 校验邀请码存在、非本人、未绑定过 → 落邀请记录（invitee 唯一约束兜底防并发重复）→
 * 按当前配置向邀请人/被邀请人发放奖励，发放结果文案快照回写记录。
 */
@Injectable()
export class BindInviteUseCase {
  constructor(
    @Inject(INVITE_REPOSITORY)
    private readonly repo: InviteRepository,
    private readonly configService: InviteConfigService,
    private readonly rewardService: InviteRewardService,
  ) {}

  async execute(userId: string, code: string): Promise<void> {
    const inviteCode = await this.repo.findCodeByCode(code.toUpperCase());
    if (!inviteCode) {
      throw new NotFoundException('邀请码不存在');
    }
    if (inviteCode.userId === userId) {
      throw new BadRequestException('不能填写自己的邀请码');
    }
    if (await this.repo.findRecordByInvitee(userId)) {
      throw new BadRequestException('你已绑定过邀请人');
    }
    const record = await this.repo.saveRecord({
      inviterId: inviteCode.userId,
      inviteeId: userId,
    });
    const config = await this.configService.get();
    const [inviterRewardText, inviteeRewardText] = await Promise.all([
      this.rewardService.issue(inviteCode.userId, config.inviter),
      this.rewardService.issue(userId, config.invitee),
    ]);
    record.inviterRewardText = inviterRewardText;
    record.inviteeRewardText = inviteeRewardText;
    await this.repo.saveRecord(record);
  }
}
