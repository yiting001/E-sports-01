import { Body, Controller, Post } from '@nestjs/common';
import type { WechatBindingView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { BindWechatUseCase } from '../../application/use-cases/bind-wechat.usecase';
import { BindWechatDto } from '../dto/bind-wechat.dto';

/** 路由：用微信授权 code 绑定通知渠道（POST /notify/wechat/bind），登录即可 */
@Controller('notify/wechat')
export class WechatBindController {
  constructor(private readonly useCase: BindWechatUseCase) {}

  @Post('bind')
  bind(@CurrentUser() user: AuthUser, @Body() dto: BindWechatDto): Promise<WechatBindingView> {
    return this.useCase.execute(user.id, dto.channel, dto.code);
  }
}
