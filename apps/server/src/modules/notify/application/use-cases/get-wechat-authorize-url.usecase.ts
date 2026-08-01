import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { WechatOfficialAuthorizeUrlView } from '@app/contracts';
import {
  WECHAT_OFFICIAL_AUTH_PORT,
  WechatOfficialAuthPort,
} from '../../domain/wechat-notify-port.interface';

/** 回跳地址仅接受 HTTP(S)，避免把用户重定向到任意协议 */
function assertSafeRedirect(redirectUri: string): void {
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    throw new BadRequestException('回跳地址无效');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new BadRequestException('回跳地址仅支持 HTTP(S)');
  }
}

/** 用例：生成公众号网页授权地址（C 端绑定入口跳转用） */
@Injectable()
export class GetWechatAuthorizeUrlUseCase {
  constructor(
    @Inject(WECHAT_OFFICIAL_AUTH_PORT)
    private readonly official: WechatOfficialAuthPort,
  ) {}

  async execute(redirectUri: string): Promise<WechatOfficialAuthorizeUrlView> {
    assertSafeRedirect(redirectUri);
    return { url: await this.official.buildAuthorizeUrl(redirectUri) };
  }
}
