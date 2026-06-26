import { LoginPayload } from '@app/contracts';
import { IsString, Length } from 'class-validator';

/** 登录入参 */
export class LoginDto implements LoginPayload {
  @IsString()
  @Length(1, 64)
  username!: string;

  @IsString()
  @Length(1, 128)
  password!: string;
}
