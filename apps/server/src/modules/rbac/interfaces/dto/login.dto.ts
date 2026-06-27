import { LoginPayload } from '@app/contracts';
import { IsString, Length } from 'class-validator';

/** 登录入参 */
export class LoginDto implements LoginPayload {
  /** 用户名或手机号 */
  @IsString()
  @Length(1, 64)
  account!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}
