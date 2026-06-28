import { Body, Controller, Post } from '@nestjs/common';
import { CreateRechargeResult } from '@app/contracts';
import { CurrentUser } from '../../../rbac/interfaces/auth/current-user.decorator';
import type { AuthUser } from '../../../rbac/interfaces/auth/metadata';
import { CreateRechargeUseCase } from '../../application/use-cases/create-recharge.usecase';
import { CreateRechargeDto } from '../dto/create-recharge.dto';

/** 路由：发起充值，返回扫码支付二维码（POST /wallet/recharge） */
@Controller('wallet')
export class RechargeCreateController {
  constructor(private readonly useCase: CreateRechargeUseCase) {}

  @Post('recharge')
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateRechargeDto,
  ): Promise<CreateRechargeResult> {
    return this.useCase.execute(user.id, dto);
  }
}
