import { IsEnum, IsString, Length } from 'class-validator';
import { NotifyWechatChannel } from '@app/contracts';

/** 微信绑定请求体：渠道 + 微信授权 code */
export class BindWechatDto {
  @IsEnum(NotifyWechatChannel, { message: '通知渠道无效' })
  channel!: NotifyWechatChannel;

  /** 小程序 wx.login code 或公众号网页授权 code */
  @IsString()
  @Length(1, 512, { message: '授权码无效' })
  code!: string;
}
