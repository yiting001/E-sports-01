import { Injectable, NotImplementedException } from '@nestjs/common';
import { CONFIG_KEYS, PayoutChannelState, PayoutProvider, fenToYuan } from '@app/contracts';
import { ConfigService } from '../../../config/application/config.service';
import {
  PayoutCallbackResult,
  PayoutExecutionStatus,
  PayoutInput,
  PayoutOutcomeUnknownError,
  PayoutPort,
  PayoutQueryInput,
  PayoutResult,
} from '../../domain/payout-port.interface';
import { AlipayClientFactory } from './alipay-client.factory';

/** 支付宝成功响应码 */
const ALIPAY_SUCCESS_CODE = '10000';
/** 支付宝转账单不存在的业务错误码 */
const ALIPAY_TRANSFER_NOT_EXIST = 'ORDER_NOT_EXIST';

/** 支付宝转账状态 → 归一渠道状态 */
const ALIPAY_TRANSFER_STATE: Record<string, PayoutChannelState> = {
  SUCCESS: PayoutChannelState.Success,
  DEALING: PayoutChannelState.Processing,
  FAIL: PayoutChannelState.Failed,
  REFUND: PayoutChannelState.Failed,
};

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
  readonly supportsCallback = false;

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

  /**
   * 同步转账：支付宝单笔转账实时返回结果（status=SUCCESS 即到账）。
   * SDK 调用失败（网络/验签）时无法确认是否已出款，抛结果未知由上层保持处理中后查单。
   */
  async transfer(input: PayoutInput): Promise<PayoutResult> {
    const alipay = await this.factory.create();
    const sceneParams = await this.buildSceneParams();
    let result: Record<string, unknown>;
    try {
      result = await alipay.exec('alipay.fund.trans.uni.transfer', {
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
    } catch {
      throw new PayoutOutcomeUnknownError('支付宝转账请求失败，渠道结果未知');
    }
    if (result.code !== ALIPAY_SUCCESS_CODE) {
      return {
        ...emptyMeta(),
        status: PayoutExecutionStatus.Failed,
        failReason: describeAlipayFailure(result).slice(0, 255),
      };
    }
    return mapAlipayTransfer(result);
  }

  /** 主动查询：alipay.fund.trans.common.query，按商户单号 + 产品码 + 业务场景查询。 */
  async queryTransfer(input: PayoutQueryInput): Promise<PayoutResult> {
    const alipay = await this.factory.create();
    let result: Record<string, unknown>;
    try {
      result = await alipay.exec('alipay.fund.trans.common.query', {
        bizContent: {
          out_biz_no: input.outBizNo,
          product_code: 'TRANS_ACCOUNT_NO_PWD',
          biz_scene: 'DIRECT_TRANSFER',
        },
      });
    } catch {
      throw new PayoutOutcomeUnknownError('支付宝转账查询失败，渠道结果未知');
    }
    if (result.code !== ALIPAY_SUCCESS_CODE) {
      const subCode = result.subCode ?? result.sub_code;
      if (subCode === ALIPAY_TRANSFER_NOT_EXIST) {
        return { ...emptyMeta(), status: PayoutExecutionStatus.NotFound, failReason: '' };
      }
      throw new PayoutOutcomeUnknownError(`支付宝转账查询失败：${describeAlipayFailure(result)}`);
    }
    return mapAlipayTransfer(result);
  }

  parseCallback(): Promise<PayoutCallbackResult> {
    throw new NotImplementedException('支付宝官方转账无异步通知');
  }

  callbackAck(): string {
    return 'success';
  }
}

function emptyMeta(): Omit<PayoutResult, 'status' | 'failReason'> {
  return {
    providerOrderId: '',
    channelOrderNo: null,
    channelState: null,
    channelErrCode: null,
    channelErrMsg: null,
    channelFeeFen: null,
  };
}

/** alipay-sdk v4 把应答键转为驼峰（subCode/subMsg），兼容两种写法透传详细错误。 */
function describeAlipayFailure(result: Record<string, unknown>): string {
  const subCode = result.subCode ?? result.sub_code;
  const subMsg = result.subMsg ?? result.sub_msg;
  return `支付宝转账失败：${String(subMsg ?? result.msg)}（code=${String(result.code)}${
    subCode ? `, sub_code=${String(subCode)}` : ''
  }）`;
}

/** 支付宝转账/查询应答（code=10000）映射为统一执行结果；转账接口成功应答无 status 时视为成功。 */
function mapAlipayTransfer(result: Record<string, unknown>): PayoutResult {
  const orderId = result.orderId ?? result.order_id;
  const rawStatus = typeof result.status === 'string' ? result.status : 'SUCCESS';
  const channelState = ALIPAY_TRANSFER_STATE[rawStatus] ?? null;
  const meta = {
    ...emptyMeta(),
    providerOrderId: orderId === undefined || orderId === null ? '' : String(orderId),
    channelState,
  };
  if (channelState === PayoutChannelState.Success) {
    return { ...meta, status: PayoutExecutionStatus.Succeeded, failReason: '' };
  }
  if (channelState === PayoutChannelState.Failed) {
    const errorCode = result.errorCode ?? result.error_code;
    const failReason = typeof errorCode === 'string' ? `支付宝转账失败：${errorCode}` : '支付宝转账失败';
    return {
      ...meta,
      channelErrCode: typeof errorCode === 'string' ? errorCode : null,
      status: PayoutExecutionStatus.Failed,
      failReason,
    };
  }
  return { ...meta, status: PayoutExecutionStatus.Processing, failReason: '' };
}
