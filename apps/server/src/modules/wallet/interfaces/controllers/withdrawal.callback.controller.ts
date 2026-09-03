import { BadRequestException, Controller, Param, Post, Req, Res } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { PayoutProvider } from '@app/contracts';
import { Public } from '../../../rbac/interfaces/auth/public.decorator';
import { HandleWithdrawalCallbackUseCase } from '../../application/use-cases/handle-withdrawal-callback.usecase';

const PAYOUT_PROVIDERS = new Set<string>(Object.values(PayoutProvider));

/**
 * 路由：转账渠道提现异步通知（POST /wallet/withdrawal/callback/:provider）。
 * 公开端点（无 JWT），由渠道服务器回调；用 @Res 直出渠道要求的原始应答（不走统一包装），
 * 并依赖原始请求体做验签。
 */
@Controller('wallet')
export class WithdrawalCallbackController {
  constructor(private readonly useCase: HandleWithdrawalCallbackUseCase) {}

  @Public()
  @Post('withdrawal/callback/:provider')
  async callback(
    @Param('provider') provider: string,
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    if (!PAYOUT_PROVIDERS.has(provider)) {
      throw new BadRequestException('未知的提现渠道');
    }
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const ack = await this.useCase.execute(provider as PayoutProvider, {
      body,
      rawBody,
      headers,
    });
    res.status(200).send(ack);
  }
}
