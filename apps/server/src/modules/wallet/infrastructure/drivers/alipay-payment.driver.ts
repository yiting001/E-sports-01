import { BadRequestException, Injectable } from '@nestjs/common';
import { PaymentProvider, fenToYuan, yuanToFen } from '@app/contracts';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import { AlipayClientFactory } from './alipay-client.factory';

/** 支付宝成功响应码 */
const ALIPAY_SUCCESS_CODE = '10000';
/** 支付宝交易成功状态 */
const ALIPAY_PAID_STATUS = new Set(['TRADE_SUCCESS', 'TRADE_FINISHED']);

/**
 * 支付宝充值驱动（扫码支付 alipay.trade.precreate）。
 * 下单返回二维码内容供前端渲染；用户支付后支付宝异步通知，经验签后入账。
 */
@Injectable()
export class AlipayPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.Alipay;

  constructor(private readonly factory: AlipayClientFactory) {}

  async createRecharge(
    input: RechargeCreateInput,
  ): Promise<RechargeCreateResult> {
    const alipay = await this.factory.create();
    const result = await alipay.exec('alipay.trade.precreate', {
      notify_url: input.notifyUrl,
      bizContent: {
        out_trade_no: input.outTradeNo,
        total_amount: fenToYuan(input.amountFen),
        subject: input.subject,
      },
    });
    if (result.code !== ALIPAY_SUCCESS_CODE) {
      throw new BadRequestException(
        `支付宝下单失败：${result.sub_msg ?? result.msg}`,
      );
    }
    return { qrCode: String(result.qrCode) };
  }

  async parseCallback(
    req: PaymentCallbackRequest,
  ): Promise<PaymentCallbackResult> {
    const alipay = await this.factory.create();
    if (!alipay.checkNotifySign(req.body)) {
      throw new BadRequestException('支付宝回调验签失败');
    }
    const body = req.body;
    return {
      outTradeNo: String(body.out_trade_no),
      providerTradeNo: String(body.trade_no),
      paidAmountFen: yuanToFen(String(body.total_amount)),
      success: ALIPAY_PAID_STATUS.has(String(body.trade_status)),
    };
  }

  callbackAck(): string {
    return 'success';
  }
}
