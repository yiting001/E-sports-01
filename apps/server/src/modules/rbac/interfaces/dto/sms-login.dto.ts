import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CHINA_MOBILE_PATTERN, SmsLoginPayload } from '@app/contracts';

/** 短信验证码登录入参 */
export class SmsLoginDto implements SmsLoginPayload {
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  /** 租户编码（选填） */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
