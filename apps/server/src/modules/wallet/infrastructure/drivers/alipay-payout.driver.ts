import { BadRequestException, Injectable } from '@nestjs/common';
import { CONFIG_KEYS, PayoutProvider, fenToYuan } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
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
 * 转账场景报备（transfer_scene_name / transfer_scene_report_infos）取自配置中心，
 * 已开通「商家转账」并要求报备的商户必须配置，否则渠道拒绝（40004）。
 */
@Injectable()
export class AlipayPayoutDriver implements PayoutPort {
  readonly provider = PayoutProvider.Alipay;
  readonly available = true;

  constructor(
    private readonly factory: AlipayClientFactory,
    private readonly config: ConfigService,
  ) {}

  /** 组装转账场景报备参数（场景名称留空则不传，兼容未要求报备的商户） */
  private async buildSceneParams(): Promise<Record<string, unknown>> {
    const sceneName = await this.config.getString(
      CONFIG_KEYS.wallet.alipayTransferSceneName,
      '',
    );
    if (!sceneName) {
      return {};
    }
    const infoType = await this.config.getString(
      CONFIG_KEYS.wallet.alipayTransferReportInfoType,
      '',
    );
    const infoContent = await this.config.getString(
      CONFIG_KEYS.wallet.alipayTransferReportInfoContent,
      '',
    );
    return {
      transfer_scene_name: sceneName,
      ...(infoType && infoContent
        ? {
            transfer_scene_report_infos: [
              { info_type: infoType, info_content: infoContent },
            ],
          }
        : {}),
    };
  }

  async transfer(input: PayoutInput): Promise<PayoutResult> {
    const alipay = await this.factory.create();
    const sceneParams = await this.buildSceneParams();
    const result = await alipay.exec('alipay.fund.trans.uni.transfer', {
      bizContent: {
        out_biz_no: input.outBizNo,
        trans_amount: fenToYuan(input.amountFen),
        product_code: 'TRANS_ACCOUNT_NO_PWD',
        biz_scene: 'DIRECT_TRANSFER',
        order_title: input.remark,
        payee_info: {
          identity: input.account,
          identity_type: 'ALIPAY_LOGON_ID',
          name: input.accountName,
        },
        remark: input.remark,
        ...sceneParams,
      },
    });
    if (result.code !== ALIPAY_SUCCESS_CODE) {
      // alipay-sdk v4 把应答键转为驼峰（subCode/subMsg），兼容两种写法透传详细错误
      const subCode = result.subCode ?? result.sub_code;
      const subMsg = result.subMsg ?? result.sub_msg;
      throw new BadRequestException(
        `支付宝转账失败：${subMsg ?? result.msg}（code=${result.code}${subCode ? `, sub_code=${subCode}` : ''}）`,
      );
    }
    return { providerOrderId: String(result.orderId) };
  }
}
