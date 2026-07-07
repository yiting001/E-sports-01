import {
  InviteConfigView,
  InviteRewardConfig,
  InviteRewardType,
} from '@app/contracts';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/** 单侧奖励配置校验 */
export class InviteRewardConfigDto implements InviteRewardConfig {
  @IsEnum(InviteRewardType)
  rewardType!: InviteRewardType;

  @IsString()
  couponId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountFen!: number;
}

/** 保存邀请奖励配置入参校验 */
export class SaveInviteConfigDto implements InviteConfigView {
  @ValidateNested()
  @Type(() => InviteRewardConfigDto)
  inviter!: InviteRewardConfigDto;

  @ValidateNested()
  @Type(() => InviteRewardConfigDto)
  invitee!: InviteRewardConfigDto;

  /** 邀请规则说明（富文本 HTML，可为空串表示不展示） */
  @IsString()
  rulesHtml!: string;
}
