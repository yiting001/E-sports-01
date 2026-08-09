import { IsString, Length } from 'class-validator';

/** 重置用户密码入参 */
export class ResetUserPasswordDto {
  @IsString()
  @Length(6, 128)
  password!: string;
}
