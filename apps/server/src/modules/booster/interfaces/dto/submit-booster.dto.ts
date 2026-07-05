import { IsString, Length } from 'class-validator';
import { BOOSTER_LIMITS, SubmitBoosterPayload } from '@app/contracts';

/** 提交打手入驻申请入参 */
export class SubmitBoosterDto implements SubmitBoosterPayload {
  @IsString()
  @Length(1, BOOSTER_LIMITS.gameNicknameMax)
  gameNickname!: string;

  @IsString()
  @Length(1, BOOSTER_LIMITS.gameNameMax)
  gameName!: string;

  @IsString()
  @Length(1, BOOSTER_LIMITS.rankMax)
  rank!: string;

  @IsString()
  @Length(1, BOOSTER_LIMITS.introMax)
  intro!: string;
}
