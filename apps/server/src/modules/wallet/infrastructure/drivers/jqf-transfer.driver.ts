import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { PayoutChannelState, PayoutProvider } from '@app/contracts';
import {
  PayoutCallbackRequest,
  PayoutCallbackResult,
  PayoutExecutionStatus,
  PayoutInput,
  PayoutOutcomeUnknownError,
  PayoutPort,
  PayoutQueryInput,
  PayoutResult,
} from '../../domain/payout-port.interface';
import { JqfPayConfig, JqfPayConfigFactory } from './jqf-pay.config';
import {
  postJqf,
  readJqfFen,
  readJqfInt,
  readJqfString,
  verifyJqfSign,
} from './jqf-pay.request';

/** 发起转账路径（pageId=45） */
const TRANSFER_PATH = 'api/transferOrder';
/** 转账查询路径（pageId=46） */
const TRANSFER_QUERY_PATH = 'api/transfer/query';
/** 转账单不存在的业务提示（计全付以 msg 文本表达） */
const TRANSFER_NOT_FOUND_TEXTS = ['转账订单不存在', '订单不存在'];

/**
 * 计全付转账状态（pageId=45/46/47）：
 * 0 订单生成 / 1 转账中 / 2 转账成功 / 3 转账失败 / 4 转账关闭
 */
const JQF_TRANSFER_STATE: Record<number, PayoutChannelState> = {
  0: PayoutChannelState.Created,
  1: PayoutChannelState.Processing,
  2: PayoutChannelState.Success,
  3: PayoutChannelState.Failed,
  4: PayoutChannelState.Closed,
};

/** 计全付转账通道参数：接口代码 + 入账方式 */
interface JqfTransferRoute {
  /** ifCode：wxpay 微信官方 / alipay 支付宝官方 */
  ifCode: string;
  /** entryType：WX_CASH 微信零钱 / ALIPAY_CASH 支付宝转账 */
  entryType: string;
}

/**
 * 计全付转账驱动基类（api/transferOrder）。
 * 转账为异步结算：发起成功仅表示渠道受理（state 0/1），最终结果由转账通知（pageId=47）
 * 或主动查询（pageId=46）确认；mchOrderNo 为幂等键，重复提交同一单号不会二次出款。
 * 手续费 = mchOrderFeeAmount（渠道转账手续费）+ mchApicostFeeAmount（技术服务费），单位分。
 */
export abstract class JqfTransferDriverBase implements PayoutPort {
  abstract readonly provider: PayoutProvider;
  readonly available = true;
  readonly supportsCallback = true;
  protected abstract readonly route: JqfTransferRoute;

  constructor(private readonly configFactory: JqfPayConfigFactory) {}

  async transfer(input: PayoutInput): Promise<PayoutResult> {
    const cfg = await this.configFactory.load();
    let data: Record<string, unknown>;
    try {
      data = await postJqf(cfg, TRANSFER_PATH, {
        mchOrderNo: input.outBizNo,
        ifCode: this.route.ifCode,
        entryType: this.route.entryType,
        amount: input.amountFen,
        currency: 'CNY',
        accountNo: input.account,
        accountName: input.accountName,
        transferDesc: input.remark,
        notifyUrl: input.notifyUrl || undefined,
      });
    } catch (error) {
      return this.classifyTransferFailure(cfg, input, error);
    }
    return mapJqfTransfer(data, '计全付转账响应格式异常，渠道结果未知');
  }

  async queryTransfer(input: PayoutQueryInput): Promise<PayoutResult> {
    const cfg = await this.configFactory.load();
    return this.queryByMchOrderNo(cfg, input.outBizNo);
  }

  async parseCallback(req: PayoutCallbackRequest): Promise<PayoutCallbackResult> {
    const cfg = await this.configFactory.load();
    return parseJqfTransferCallback(cfg, req);
  }

  callbackAck(): string {
    return 'SUCCESS';
  }

  /**
   * 发起失败分类：网关不可达/响应异常 → 结果未知；业务拒绝先按商户单号查一次，
   * 渠道已存在该单（重复提交）以查询结果为准，确实不存在才判定为明确失败。
   */
  private async classifyTransferFailure(
    cfg: JqfPayConfig,
    input: PayoutInput,
    error: unknown,
  ): Promise<PayoutResult> {
    if (error instanceof BadGatewayException) {
      throw new PayoutOutcomeUnknownError('计全付转账服务暂不可用，渠道结果未知');
    }
    const queried = await this.queryByMchOrderNo(cfg, input.outBizNo);
    if (queried.status !== PayoutExecutionStatus.NotFound) {
      return queried;
    }
    return {
      ...emptyMeta(),
      status: PayoutExecutionStatus.Failed,
      failReason: error instanceof Error ? error.message.slice(0, 255) : '计全付转账失败',
    };
  }

  private async queryByMchOrderNo(cfg: JqfPayConfig, mchOrderNo: string): Promise<PayoutResult> {
    let data: Record<string, unknown>;
    try {
      data = await postJqf(cfg, TRANSFER_QUERY_PATH, { mchOrderNo });
    } catch (error) {
      if (isNotFoundFailure(error)) {
        return { ...emptyMeta(), status: PayoutExecutionStatus.NotFound, failReason: '' };
      }
      throw new PayoutOutcomeUnknownError('计全付转账状态查询失败，渠道结果未知');
    }
    return mapJqfTransfer(data, '计全付转账查询响应格式异常，渠道结果未知');
  }
}

/** 计全付转账 → 支付宝账户（ifCode=alipay，entryType=ALIPAY_CASH，accountNo 为支付宝账号） */
@Injectable()
export class JqfAlipayTransferDriver extends JqfTransferDriverBase {
  readonly provider = PayoutProvider.JqfAlipay;
  protected readonly route: JqfTransferRoute = { ifCode: 'alipay', entryType: 'ALIPAY_CASH' };
}

/** 计全付转账 → 微信零钱（ifCode=wxpay，entryType=WX_CASH，accountNo 为用户 openid） */
@Injectable()
export class JqfWechatTransferDriver extends JqfTransferDriverBase {
  readonly provider = PayoutProvider.JqfWechat;
  protected readonly route: JqfTransferRoute = { ifCode: 'wxpay', entryType: 'WX_CASH' };
}

/**
 * 解析并验签计全付转账异步通知（pageId=47）：验签 → 校验商户号/appId → 映射状态与费用。
 * 金额与商户单号一致性由上层结合本地提现单核对。
 */
export function parseJqfTransferCallback(
  cfg: JqfPayConfig,
  req: PayoutCallbackRequest,
): PayoutCallbackResult {
  if (!verifyJqfSign(req.body, cfg.apiKey)) {
    throw new BadRequestException('计全付转账通知验签失败');
  }
  if (req.body.mchNo !== cfg.mchNo || req.body.appId !== cfg.appId) {
    throw new BadRequestException('计全付转账通知商户号或 appId 不匹配');
  }
  const mchOrderNo = readJqfString(req.body.mchOrderNo);
  const amountFen = readJqfInt(req.body.amount);
  if (!mchOrderNo || amountFen === null) {
    throw new BadRequestException('计全付转账通知参数异常');
  }
  let mapped: PayoutResult;
  try {
    mapped = mapJqfTransfer(req.body, '计全付转账通知参数异常');
  } catch {
    throw new BadRequestException('计全付转账通知参数异常');
  }
  return { ...mapped, outBizNo: mchOrderNo, amountFen };
}

/** 判断错误是否为「转账单不存在」类业务失败。 */
function isNotFoundFailure(error: unknown): boolean {
  return (
    error instanceof BadRequestException &&
    TRANSFER_NOT_FOUND_TEXTS.some((text) => error.message.includes(text))
  );
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

/** 汇总渠道手续费：两项费用均缺失时为 null，否则按分相加。 */
function sumChannelFee(data: Record<string, unknown>): number | null {
  const orderFee = readJqfFen(data.mchOrderFeeAmount);
  const apiCostFee = readJqfFen(data.mchApicostFeeAmount);
  if (orderFee === null && apiCostFee === null) {
    return null;
  }
  return (orderFee ?? 0) + (apiCostFee ?? 0);
}

/**
 * 计全付转账发起/查询/通知报文映射为统一执行结果。
 * state 0/1 → Processing；2 → Succeeded；3/4 → Failed（渠道错误描述作为失败原因）。
 */
function mapJqfTransfer(data: Record<string, unknown>, formatErrorMessage: string): PayoutResult {
  const state = readJqfInt(data.state);
  const transferId = readJqfString(data.transferId);
  const channelState = state === null ? undefined : JQF_TRANSFER_STATE[state];
  if (!transferId || channelState === undefined) {
    throw new PayoutOutcomeUnknownError(formatErrorMessage);
  }
  const errCode = readJqfString(data.errCode);
  const errMsg = readJqfString(data.errMsg);
  const meta = {
    providerOrderId: transferId,
    channelOrderNo: readJqfString(data.channelOrderNo),
    channelState,
    channelErrCode: errCode,
    channelErrMsg: errMsg ? errMsg.slice(0, 255) : null,
    channelFeeFen: sumChannelFee(data),
  };
  if (channelState === PayoutChannelState.Success) {
    return { ...meta, status: PayoutExecutionStatus.Succeeded, failReason: '' };
  }
  if (channelState === PayoutChannelState.Failed || channelState === PayoutChannelState.Closed) {
    const fallback = channelState === PayoutChannelState.Closed ? '计全付转账已关闭' : '计全付转账失败';
    return {
      ...meta,
      status: PayoutExecutionStatus.Failed,
      failReason: (errMsg ? `${fallback}：${errMsg}` : fallback).slice(0, 255),
    };
  }
  return { ...meta, status: PayoutExecutionStatus.Processing, failReason: '' };
}
