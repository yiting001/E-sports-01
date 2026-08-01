import { IsString, Length } from 'class-validator';

/** 公众号网页授权地址请求参数 */
export class WechatAuthorizeUrlQueryDto {
  /** 授权完成后的回跳地址（C 端绑定页），仅接受 HTTP(S) */
  @IsString()
  @Length(1, 1024, { message: '回跳地址无效' })
  redirectUri!: string;
}
