import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CHINA_MOBILE_PATTERN, SendSmsCodePayload } from '@app/contracts';

/** 发送登录短信验证码入参 */
export class SendSmsCodeDto implements SendSmsCodePayload {
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone!: string;

  /** 租户编码（选填） */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
