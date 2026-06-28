import { BadRequestException, Injectable } from '@nestjs/common';
import { PayoutProvider, fenToYuan } from '@app/contracts';
import {
  PayoutInput,
  PayoutPort,
  PayoutResult,
} from '../../domain/payout-port.interface';
import { AlipayClientFactory } from './alipay-client.factory';

/** 支付宝成功响应码 */
const ALIPAY_SUCCESS_CODE = '10000';

/**
 * 支付宝提现（转账到账）驱动：alipay.fund.trans.uni.transfer。
 * 向收款方支付宝登录号直接转账，成功返回渠道转账单号。
 */
@Injectable()
export class AlipayPayoutDriver implements PayoutPort {
  readonly provider = PayoutProvider.Alipay;
  readonly available = true;

  constructor(private readonly factory: AlipayClientFactory) {}

  async transfer(input: PayoutInput): Promise<PayoutResult> {
    const alipay = await this.factory.create();
    const result = await alipay.exec('alipay.fund.trans.uni.transfer', {
      bizContent: {
        out_biz_no: input.outBizNo,
        trans_amount: fenToYuan(input.amountFen),
        product_code: 'TRANS_ACCOUNT_NO_PScA',
        biz_scene: 'DIRECT_TRANSFER',
        order_title: input.remark,
        payee_info: {
          identity: input.account,
          identity_type: 'ALIPAY_LOGON_ID',
          name: input.accountName,
        },
        remark: input.remark,
      },
    });
    if (result.code !== ALIPAY_SUCCESS_CODE) {
      throw new BadRequestException(
        `支付宝转账失败：${result.sub_msg ?? result.msg}`,
      );
    }
    return { providerOrderId: String(result.orderId) };
  }
}
