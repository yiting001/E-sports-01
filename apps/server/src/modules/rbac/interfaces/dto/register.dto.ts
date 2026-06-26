import { RegisterPayload } from '@app/contracts';
import { IsOptional, IsString, Length } from 'class-validator';

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
}
