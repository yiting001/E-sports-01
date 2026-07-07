import { BindInviteBody, INVITE_LIMITS } from '@app/contracts';
import { IsString, Length } from 'class-validator';

/** 填码绑定入参校验 */
export class BindInviteDto implements BindInviteBody {
  @IsString()
  @Length(INVITE_LIMITS.codeLength, INVITE_LIMITS.codeLength, {
    message: '邀请码格式不正确',
  })
  code!: string;
}
