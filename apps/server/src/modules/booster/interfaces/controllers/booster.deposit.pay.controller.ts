import { Controller, Post } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { PayDepositUseCase } from '../../application/use-cases/pay-deposit.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';

/**
 * 路由：打手缴纳押金（POST /booster/deposit/pay）。
 * 仅登录态；从钱包余额补足配置应缴额，经账务单元记 deposit 流水。
 */
@Controller('booster')
export class BoosterDepositPayController {
  constructor(private readonly useCase: PayDepositUseCase) {}

  @Post('deposit/pay')
  pay(@CurrentUser() user: AuthUser): Promise<BoosterView> {
    return this.useCase.execute(user.id);
  }
}
