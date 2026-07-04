import { IsOptional, IsString, Length, Matches } from 'class-validator';
import { CHINA_MOBILE_PATTERN, SmsRegisterPayload } from '@app/contracts';

/** 短信验证码注册入参 */
export class SmsRegisterDto implements SmsRegisterPayload {
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone!: string;

  @IsString()
  @Length(4, 8)
  code!: string;

  /** 昵称（选填），缺省按手机号生成 */
  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  /** 注册到的租户编码（选填），空表示默认租户 */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
