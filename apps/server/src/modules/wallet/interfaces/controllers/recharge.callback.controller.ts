import { Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PaymentProvider } from '@app/contracts';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';
import { HandleRechargeCallbackUseCase } from '../../application/use-cases/handle-recharge-callback.usecase';
import { PaymentResolver } from '../../application/payment.resolver';

/**
 * 路由：支付渠道充值异步回调（POST /wallet/recharge/callback/:provider）。
 * 公开端点（无 JWT），由渠道服务器回调；用 @Res 直出渠道要求的原始应答（不走统一包装），
 * 并依赖原始请求体做验签。
 *
 * GET 同路径用于「回调地址接入校验」（微信小程序消息推送保存配置时发起），
 * 仅支持实现 verifyCallbackUrl 的渠道（当前为微信小程序虚拟支付）。
 */
@Controller('wallet')
export class RechargeCallbackController {
  constructor(
    private readonly useCase: HandleRechargeCallbackUseCase,
    private readonly paymentResolver: PaymentResolver,
  ) {}

  @Public()
  @Get('recharge/callback/:provider')
  async verify(
    @Param('provider') provider: PaymentProvider,
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    const port = this.paymentResolver.resolve(provider);
    if (!port.verifyCallbackUrl) {
      res
        .status(400)
        .send('该充值渠道不支持回调地址校验（仅微信小程序虚拟支付需要）');
      return;
    }
    const echo = await port.verifyCallbackUrl(query);
    res.status(200).type('text/plain').send(echo);
  }

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
