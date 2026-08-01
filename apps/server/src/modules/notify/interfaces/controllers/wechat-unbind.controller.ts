import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { UnbindWechatUseCase } from '../../application/use-cases/unbind-wechat.usecase';
import { UnbindWechatDto } from '../dto/unbind-wechat.dto';

/** 路由：解除本人微信通知绑定（POST /notify/wechat/unbind），登录即可 */
@Controller('notify/wechat')
export class WechatUnbindController {
  constructor(private readonly useCase: UnbindWechatUseCase) {}

  @Post('unbind')
  unbind(@CurrentUser() user: AuthUser, @Body() dto: UnbindWechatDto): Promise<void> {
    return this.useCase.execute(user.id, dto.channel);
  }
}
