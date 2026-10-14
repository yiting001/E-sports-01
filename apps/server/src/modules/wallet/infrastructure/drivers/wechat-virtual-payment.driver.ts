import { BadRequestException, Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { PaymentProvider } from '@app/contracts';
import {
  PaymentCallbackRequest,
  PaymentCallbackResult,
  PaymentPort,
  PaymentQueryResult,
  RechargeCreateInput,
  RechargeCreateResult,
} from '../../domain/payment-port.interface';
import {
  WechatVirtualPayConfig,
  WechatVirtualPayConfigFactory,
} from './wechat-virtual-pay.config';

/** 小程序登录凭证换取 session_key 的官方地址 */
const JSCODE2SESSION_URL = 'https://api.weixin.qq.com/sns/jscode2session';
/** paySig 签名前缀：uri 固定为 requestVirtualPayment */
const PAY_SIG_URI = 'requestVirtualPayment';
/** 回调 attach 标识：区分钱包充值回调与其他虚拟支付场景 */
export const WECHAT_VIRTUAL_ATTACH = 'wallet_recharge';
/** 代币支付成功事件（充值入账依据） */
const EVENT_COIN_PAY = 'xpay_coin_pay_notify';
/** 道具直购成功事件（本平台使用代币模式，兼容解析以便排障） */
const EVENT_GOODS_DELIVER = 'xpay_goods_deliver_notify';
/** 回调金额候选字段（现网字段名以微信文档为准；命中任一即用，全部缺失则如实报错） */
const AMOUNT_CANDIDATES = [
  'TotalFee',
  'Amount',
  'PayAmount',
  'GoodsPrice',
  'PaidAmount',
] as const;
/** 代币数量候选字段（代币模式下按 wallet.wechatVirtual.coinPerYuan 换算金额） */
const COIN_CANDIDATES = ['Coin', 'BuyQuantity', 'CoinAmount'] as const;

/** jscode2session 响应（仅取所需字段） */
interface Jscode2SessionResponse {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

/** 虚拟支付拉起参数（本驱动返回体） */
interface VirtualPayParams {
  signData: string;
  paySig: string;
  signature: string;
  mode: 'short_series_coin' | 'short_series_goods';
}

/**
 * 微信小程序虚拟支付驱动（代币充值模式）。
 *
 * 用途：小程序内「微信充值」把法币换成平台钱包余额，入账后下单仍走余额支付（不改动订单链路）。
 * 拉起：服务端按微信规则组装 signData（**JSON 字符串，字段顺序固定**）并双签名下发：
 *   - paySig   = HMAC-SHA256(`requestVirtualPayment&{signData}`, AppKey)
 *   - signature = HMAC-SHA256(signData, session_key)  // session_key 由 wx.login 的 code 换取
 * 客户端原样传给 wx.requestVirtualPayment(short_series_coin)，不得重新序列化。
 *
 * 入账：微信推送代币支付/道具发货通知到配置的回调地址（本模块复用
 * `POST /api/wallet/recharge/callback/wechat_virtual`），解析出业务单号与金额后由
 * WalletLedger.creditRecharge 幂等入账（单号唯一索引 + 金额校验 + 已支付短路）。
 *
 * 注意：虚拟支付无官方「主动查单」接口时以回调为权威，queryTrade 恒返回未支付（不抛异常）。
 */
@Injectable()
export class WechatVirtualPaymentDriver implements PaymentPort {
  readonly provider = PaymentProvider.WechatVirtual;

  constructor(private readonly configFactory: WechatVirtualPayConfigFactory) {}

  async createRecharge(input: RechargeCreateInput): Promise<RechargeCreateResult> {
    const cfg = await this.configFactory.load();
    if (!input.payerLoginCode) {
      throw new BadRequestException('虚拟支付缺少小程序登录凭证，请在小程序内重新登录后重试');
    }
    const sessionKey = await this.exchangeSessionKey(cfg, input.payerLoginCode);
    // 代币模式：buyQuantity 为代币数量，按「每元代币数」换算（默认 1 元 = 1 代币）
    const buyQuantity = Math.max(
      1,
      Math.round((input.amountFen / 100) * cfg.coinPerYuan),
    );
    const signData = this.buildSignData(cfg, {
      buyQuantity,
      outTradeNo: input.outTradeNo,
    });
    const params: VirtualPayParams = {
      signData,
      paySig: signHmacSha256(signData, cfg.appKey, PAY_SIG_URI),
      signature: signHmacSha256(signData, sessionKey),
      mode: 'short_series_coin',
    };
    return { qrCode: '', virtualPayParams: params };
  }

  async parseCallback(req: PaymentCallbackRequest): Promise<PaymentCallbackResult> {
    const payload = normalizeCallbackPayload(req.body);
    const event = String(payload.Event ?? payload.event ?? '');
    if (event !== EVENT_COIN_PAY && event !== EVENT_GOODS_DELIVER) {
      throw new BadRequestException(
        `微信虚拟支付回调事件不支持：${event || '（缺少 Event 字段）'}；` +
          `请在回调地址收到的是 JSON 推送（本驱动暂不支持 XML 推送，可联系开发扩展）`,
      );
    }
    const outTradeNo = String(payload.OutTradeNo ?? payload.out_trade_no ?? '');
    if (!outTradeNo) {
      throw new BadRequestException(
        `微信虚拟支付回调缺少 OutTradeNo，收到的顶层字段：${Object.keys(payload).join(', ')}`,
      );
    }
    const cfg = await this.configFactory.load();
    const paidAmountFen = resolvePaidAmountFen(payload, cfg.coinPerYuan);
    if (paidAmountFen === null) {
      throw new BadRequestException(
        `微信虚拟支付回调缺少金额字段，收到的顶层字段：${Object.keys(payload).join(', ')}`,
      );
    }
    return {
      outTradeNo,
      providerTradeNo: String(payload.BillNo ?? payload.OrderId ?? ''),
      paidAmountFen,
      success: true,
      channelFeeFen: null,
    };
  }

  async queryTrade(_outTradeNo: string): Promise<PaymentQueryResult> {
    // 虚拟支付未提供官方查单接口（以支付回调为权威）；返回未支付以保留 pending 状态
    return { paid: false, providerTradeNo: '', paidAmountFen: 0 };
  }

  callbackAck(): string {
    // 微信要求应答：成功 {"ErrCode":0,"ErrMsg":"Success"}；JSON 推送即回 JSON
    return JSON.stringify({ ErrCode: 0, ErrMsg: 'Success' });
  }

  /** 按微信规则组装 signData（JSON 字符串；字段顺序固定，客户端必须原样透传） */
  private buildSignData(
    cfg: WechatVirtualPayConfig,
    input: { buyQuantity: number; outTradeNo: string },
  ): string {
    return JSON.stringify({
      offerId: cfg.offerId,
      buyQuantity: input.buyQuantity,
      currencyType: 'CNY',
      env: cfg.env,
      outTradeNo: input.outTradeNo,
      attach: WECHAT_VIRTUAL_ATTACH,
    });
  }

  /** 用 wx.login 的 code 换取 session_key（用户态签名所需） */
  private async exchangeSessionKey(
    cfg: WechatVirtualPayConfig,
    loginCode: string,
  ): Promise<string> {
    const url =
      `${JSCODE2SESSION_URL}?appid=${encodeURIComponent(cfg.appId)}` +
      `&secret=${encodeURIComponent(cfg.appSecret)}` +
      `&js_code=${encodeURIComponent(loginCode)}&grant_type=authorization_code`;
    const resp = await fetch(url);
    const text = await resp.text();
    let data: Jscode2SessionResponse;
    try {
      data = JSON.parse(text) as Jscode2SessionResponse;
    } catch {
      throw new BadRequestException('小程序登录凭证校验失败：返回内容无法解析');
    }
    if (!data.session_key) {
      throw new BadRequestException(
        `小程序登录凭证校验失败（errcode=${data.errcode ?? '未知'}）：${data.errmsg ?? '请重新登录后重试'}`,
      );
    }
    return data.session_key;
  }
}

/** HMAC-SHA256 十六进制签名；微信虚拟支付 paySig 约定为 `{uri}&{signData}` 一起参与签名 */
export function signHmacSha256(
  signData: string,
  key: string,
  uri?: string,
): string {
  const message = uri ? `${uri}&${signData}` : signData;
  return createHmac('sha256', key).update(message).digest('hex');
}

/** 解析回调载荷：兼容 JSON 字符串/对象（微信推送为 JSON 时直接可用） */
function normalizeCallbackPayload(body: Record<string, unknown>): Record<string, unknown> {
  const raw = (body as { raw?: unknown }).raw;
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return body;
    }
  }
  return body;
}

/** 从回调载荷解析已付金额（分）：优先法币字段，其次按代币数量换算；均缺失返回 null */
export function resolvePaidAmountFen(
  payload: Record<string, unknown>,
  coinPerYuan: number,
): number | null {
  const nested =
    (payload.WechatPayInfo as Record<string, unknown> | undefined) ??
    (payload.CoinInfo as Record<string, unknown> | undefined) ??
    {};
  for (const field of AMOUNT_CANDIDATES) {
    const value = toPositiveInt(payload[field]) ?? toPositiveInt(nested[field]);
    if (value !== null) {
      return value;
    }
  }
  for (const field of COIN_CANDIDATES) {
    const coins = toPositiveInt(payload[field]) ?? toPositiveInt(nested[field]);
    if (coins !== null) {
      const ratio = coinPerYuan > 0 ? coinPerYuan : 1;
      return Math.round((coins / ratio) * 100);
    }
  }
  return null;
}

function toPositiveInt(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}
