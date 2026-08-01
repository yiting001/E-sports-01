import { Controller, Get } from '@nestjs/common';
import type { MyWechatBindingsView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { GetMyWechatBindingsUseCase } from '../../application/use-cases/get-my-wechat-bindings.usecase';

/** 路由：查询本人微信通知绑定概览（GET /notify/wechat/mine），登录即可 */
@Controller('notify/wechat')
export class WechatBindingMineController {
  constructor(private readonly useCase: GetMyWechatBindingsUseCase) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser): Promise<MyWechatBindingsView> {
    return this.useCase.execute(user.id);
  }
}
