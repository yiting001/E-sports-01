import { IsEnum } from 'class-validator';
import { NotifyWechatChannel } from '@app/contracts';

/** 解绑请求体：仅渠道 */
export class UnbindWechatDto {
  @IsEnum(NotifyWechatChannel, { message: '通知渠道无效' })
  channel!: NotifyWechatChannel;
}
