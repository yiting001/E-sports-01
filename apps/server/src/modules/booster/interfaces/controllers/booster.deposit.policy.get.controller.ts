import { Controller, Get } from '@nestjs/common';
import { BoosterDepositPolicy } from '@app/contracts';
import { GetDepositPolicyUseCase } from '../../application/use-cases/get-deposit-policy.usecase';

/**
 * 路由：查询押金交付策略（GET /booster/deposit/policy）。
 * 仅登录态：C 端展示缴纳区间，管理端编辑时回显。
 */
@Controller('booster')
export class BoosterDepositPolicyGetController {
  constructor(private readonly useCase: GetDepositPolicyUseCase) {}

  @Get('deposit/policy')
  get(): Promise<BoosterDepositPolicy> {
    return this.useCase.execute();
  }
}
