import { Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentProvider } from '@app/contracts';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';
import { HandleRechargeCallbackUseCase } from '../../application/use-cases/handle-recharge-callback.usecase';

/**
 * 路由：支付渠道充值异步回调（POST /wallet/recharge/callback/:provider）。
 * 公开端点（无 JWT），由渠道服务器回调；用 @Res 直出渠道要求的原始应答（不走统一包装），
 * 并依赖原始请求体做验签。
 */
@Controller('wallet')
export class RechargeCallbackController {
  constructor(private readonly useCase: HandleRechargeCallbackUseCase) {}

  @Public()
  @Post('recharge/callback/:provider')
  async callback(
    @Param('provider') provider: PaymentProvider,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ack = await this.useCase.execute(provider, {
      body,
      rawBody,
      headers,
    });
    res.status(200).send(ack);
  }
}
