import { LoginPayload } from '@app/contracts';
import { IsOptional, IsString, Length } from 'class-validator';

/** 登录入参 */
export class LoginDto implements LoginPayload {
  /** 用户名或手机号 */
  @IsString()
  @Length(1, 64)
  account!: string;

  @IsString()
  @Length(1, 128)
  password!: string;

  /** 租户编码（选填） */
  @IsOptional()
  @IsString()
  @Length(0, 64)
  tenantCode?: string;
}
