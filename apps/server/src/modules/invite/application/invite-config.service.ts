import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CONFIG_KEYS,
  ConfigGroup,
  ConfigValueType,
  InviteConfigView,
  InviteRewardConfig,
  InviteRewardType,
  fenToYuan,
} from '@app/contracts';
import { ConfigService } from '../../config/application/config.service';
import { UpsertConfigUseCase } from '../../config/application/use-cases/upsert-config.usecase';
import { CouponGrantService } from '../../coupon/application/coupon-grant.service';

/** 单侧奖励的三个配置键 */
interface RewardKeys {
  rewardType: string;
  couponId: string;
  amountFen: string;
}

const INVITER_KEYS: RewardKeys = {
  rewardType: CONFIG_KEYS.invite.inviterRewardType,
  couponId: CONFIG_KEYS.invite.inviterCouponId,
  amountFen: CONFIG_KEYS.invite.inviterAmountFen,
};

const INVITEE_KEYS: RewardKeys = {
  rewardType: CONFIG_KEYS.invite.inviteeRewardType,
  couponId: CONFIG_KEYS.invite.inviteeCouponId,
  amountFen: CONFIG_KEYS.invite.inviteeAmountFen,
};

/**
 * 邀请奖励配置服务。
 * 配置落配置中心（邀请人/被邀请人各一组：奖励方式 + 券模板 + 入账金额），
 * 保存前校验（券须存在且上架、金额须为正），并提供奖励说明文案。
 */
@Injectable()
export class InviteConfigService {
  constructor(
    private readonly config: ConfigService,
    private readonly upsert: UpsertConfigUseCase,
    private readonly couponGrant: CouponGrantService,
  ) {}

  /** 读取当前邀请奖励配置 */
  async get(): Promise<InviteConfigView> {
    const [inviter, invitee, rulesHtml] = await Promise.all([
      this.readSide(INVITER_KEYS),
      this.readSide(INVITEE_KEYS),
      this.config.getString(CONFIG_KEYS.invite.rules, ''),
    ]);
    return { inviter, invitee, rulesHtml };
  }

  /** 保存邀请奖励配置（校验后逐键落配置中心） */
  async save(view: InviteConfigView): Promise<void> {
    await Promise.all([
      this.validateSide(view.inviter, '邀请人'),
      this.validateSide(view.invitee, '被邀请人'),
    ]);
    await this.writeSide(INVITER_KEYS, view.inviter, '邀请人');
    await this.writeSide(INVITEE_KEYS, view.invitee, '被邀请人');
    await this.upsert.execute({
      key: CONFIG_KEYS.invite.rules,
      value: view.rulesHtml,
      type: ConfigValueType.RichText,
      group: ConfigGroup.Invite,
      remark: '邀请规则说明（富文本，C 端邀请页展示，空则不展示）',
    });
  }

  /** 奖励说明文案（如「优惠券『满50减10』」/「钱包入账 5.00 元」，不发放为空串） */
  async describe(cfg: InviteRewardConfig): Promise<string> {
    if (cfg.rewardType === InviteRewardType.Coupon) {
      const title = await this.couponGrant.titleOf(cfg.couponId);
      return title ? `优惠券「${title}」` : '';
    }
    if (cfg.rewardType === InviteRewardType.Wallet) {
      return cfg.amountFen > 0 ? `钱包入账 ${fenToYuan(cfg.amountFen)} 元` : '';
    }
    return '';
  }

  private async readSide(keys: RewardKeys): Promise<InviteRewardConfig> {
    const [rewardType, couponId, amountFen] = await Promise.all([
      this.config.getString(keys.rewardType, InviteRewardType.None),
      this.config.getString(keys.couponId, ''),
      this.config.getNumber(keys.amountFen, 0),
    ]);
    return { rewardType: rewardType as InviteRewardType, couponId, amountFen };
  }

  private async validateSide(
    cfg: InviteRewardConfig,
    side: string,
  ): Promise<void> {
    if (cfg.rewardType === InviteRewardType.Coupon) {
      const title = cfg.couponId
        ? await this.couponGrant.titleOf(cfg.couponId)
        : null;
      if (!title) {
        throw new BadRequestException(`${side}奖励优惠券不存在或已下架`);
      }
    }
    if (
      cfg.rewardType === InviteRewardType.Wallet &&
      (!Number.isInteger(cfg.amountFen) || cfg.amountFen <= 0)
    ) {
      throw new BadRequestException(`${side}奖励入账金额须为正整数（分）`);
    }
  }

  private async writeSide(
    keys: RewardKeys,
    cfg: InviteRewardConfig,
    side: string,
  ): Promise<void> {
    await this.upsert.execute({
      key: keys.rewardType,
      value: cfg.rewardType,
      type: ConfigValueType.String,
      group: ConfigGroup.Invite,
      remark: `${side}奖励方式：none / coupon / wallet`,
    });
    await this.upsert.execute({
      key: keys.couponId,
      value: cfg.couponId,
      type: ConfigValueType.String,
      group: ConfigGroup.Invite,
      remark: `${side}奖励优惠券模板 id（奖励方式为 coupon 时生效）`,
    });
    await this.upsert.execute({
      key: keys.amountFen,
      value: String(cfg.amountFen),
      type: ConfigValueType.Number,
      group: ConfigGroup.Invite,
      remark: `${side}奖励钱包入账金额（分，奖励方式为 wallet 时生效）`,
    });
  }
}
