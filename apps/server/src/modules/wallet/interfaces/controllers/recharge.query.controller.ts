import { Controller, Get, Param } from '@nestjs/common';
import { RechargeStatusView } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { QueryRechargeUseCase } from '../../application/use-cases/query-recharge.usecase';

/**
 * 路由：主动查询充值支付结果（GET /wallet/recharge/:outTradeNo/status）。
 * 仅本人可查；待支付时调渠道官方查单接口兜底确认，已支付即幂等入账并返回最新状态。
 */
@Controller('wallet')
export class RechargeQueryController {
  constructor(private readonly useCase: QueryRechargeUseCase) {}

  @Get('recharge/:outTradeNo/status')
  query(
    @CurrentUser() user: AuthUser,
    @Param('outTradeNo') outTradeNo: string,
  ): Promise<RechargeStatusView> {
    return this.useCase.execute(user.id, outTradeNo);
  }
}
