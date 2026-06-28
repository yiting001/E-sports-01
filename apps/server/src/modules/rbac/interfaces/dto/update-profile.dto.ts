import {
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { CHINA_MOBILE_PATTERN, UpdateProfilePayload } from '@app/contracts';

/** 自助更新本人资料入参 */
export class UpdateProfileDto implements UpdateProfilePayload {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  @IsOptional()
  @IsString()
  @Length(0, 512)
  avatar?: string;

  /** 传空串可解绑手机号；传非空须为合法手机号 */
  @ValidateIf((o: UpdateProfileDto) => o.phone !== undefined && o.phone !== '')
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone?: string;
}
