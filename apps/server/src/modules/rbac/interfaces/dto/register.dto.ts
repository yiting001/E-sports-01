import { CHINA_MOBILE_PATTERN, RegisterPayload } from '@app/contracts';
import { IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

/** 注册入参 */
export class RegisterDto implements RegisterPayload {
  @IsString()
  @Length(1, 64)
  username!: string;

  @IsString()
  @Length(6, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;

  /** 选填，绑定后可用短信验证码登录 */
  @ValidateIf((o: RegisterDto) => o.phone !== undefined && o.phone !== '')
  @Matches(CHINA_MOBILE_PATTERN, { message: '手机号格式不正确' })
  phone?: string;

  /** 注册到的租户编码（选填），空表示默认租户 */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
