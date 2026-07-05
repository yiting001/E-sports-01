import { IsOptional, IsString, Length } from 'class-validator';
import { BOOSTER_LIMITS, UpdateBoosterPayload } from '@app/contracts';

/** 管理端编辑打手资料入参（各字段可选，仅更新传入项） */
export class UpdateBoosterDto implements UpdateBoosterPayload {
  @IsOptional()
  @IsString()
  @Length(1, BOOSTER_LIMITS.gameNicknameMax)
  gameNickname?: string;

  @IsOptional()
  @IsString()
  @Length(1, BOOSTER_LIMITS.gameNameMax)
  gameName?: string;

  @IsOptional()
  @IsString()
  @Length(1, BOOSTER_LIMITS.rankMax)
  rank?: string;

  @IsOptional()
  @IsString()
  @Length(1, BOOSTER_LIMITS.introMax)
  intro?: string;
}
