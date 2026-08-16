import { Inject, Injectable } from '@nestjs/common';
import { WechatIdentityStatusView } from '@app/contracts';
import { USER_REPOSITORY, UserRepository } from '../domain/user-repository.interface';
import {
  WECHAT_IDENTITY_REPOSITORY,
  WechatIdentityRepository,
} from '../domain/wechat-identity-repository.interface';

/**
 * 微信登录身份查询服务（对模块外导出）。
 * 订单等模块在发起公众号 JSAPI 支付时按用户取 openid；openid 不经接口层回传。
 */
@Injectable()
export class WechatIdentityService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(WECHAT_IDENTITY_REPOSITORY)
    private readonly identities: WechatIdentityRepository,
  ) {}

  /** 取用户已绑定的公众号 openid；未绑定返回空串。 */
  async findOpenid(userId: string): Promise<string> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      return '';
    }
    const identity = await this.identities.findByUser(userId, user.tenantId);
    return identity?.openid ?? '';
  }

  /** 当前用户绑定状态（不回传 openid）。 */
  async status(userId: string): Promise<WechatIdentityStatusView> {
    return { bound: (await this.findOpenid(userId)) !== '' };
  }
}
