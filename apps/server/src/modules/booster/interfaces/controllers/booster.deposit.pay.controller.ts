import { Body, Controller, Post } from '@nestjs/common';
import { BoosterView } from '@app/contracts';
import { PayDepositUseCase } from '../../application/use-cases/pay-deposit.usecase';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { PayDepositDto } from '../dto/pay-deposit.dto';

/**
 * 路由：打手缴纳押金（POST /booster/deposit/pay）。
 * 仅登录态；区间内自选金额从钱包余额扣除，经账务单元记 deposit 流水。
 */
@Controller('booster')
export class BoosterDepositPayController {
  constructor(private readonly useCase: PayDepositUseCase) {}

  @Post('deposit/pay')
  pay(
    @CurrentUser() user: AuthUser,
    @Body() dto: PayDepositDto,
  ): Promise<BoosterView> {
    return this.useCase.execute(user.id, dto.amountFen);
  }
}
