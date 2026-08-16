import { Body, Controller, Get, Post } from '@nestjs/common';
import { WechatIdentityStatusView } from '@app/contracts';
import { BindWechatIdentityUseCase } from '../../application/use-cases/bind-wechat-identity.usecase';
import { WechatIdentityService } from '../../application/wechat-identity.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/metadata';
import { WechatBindDto } from '../dto/wechat-bind.dto';

/** 路由：微信登录身份绑定与查询（/auth/wechat/identity），登录即可 */
@Controller('auth/wechat')
export class AuthWechatBindController {
  constructor(
    private readonly bindUseCase: BindWechatIdentityUseCase,
    private readonly identityService: WechatIdentityService,
  ) {}

  /** 用微信授权 code 绑定当前账号（JSAPI 支付前置） */
  @Post('bind')
  bind(
    @CurrentUser() user: AuthUser,
    @Body() dto: WechatBindDto,
  ): Promise<WechatIdentityStatusView> {
    return this.bindUseCase.execute(user.id, dto.code);
  }

  /** 当前账号的微信绑定状态（不回传 openid） */
  @Get('identity')
  identity(@CurrentUser() user: AuthUser): Promise<WechatIdentityStatusView> {
    return this.identityService.status(user.id);
  }
}
