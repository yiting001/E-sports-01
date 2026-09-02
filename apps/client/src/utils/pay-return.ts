import {
  PAY_RETURN_QUERY_KEYS,
  PayReturnKind,
  PayReturnPageAction,
} from '@app/contracts';
import type { LocationQuery } from 'vue-router';

/** 支付回跳落地页的 hash 路由路径（与路由表 pay-return 一致） */
export const PAY_RETURN_ROUTE_PATH = '/pay/return';

/** 构造回跳地址所需的页面位置信息（便于单测注入） */
export interface PayReturnLocation {
  readonly origin: string;
  readonly pathname: string;
}

/**
 * 构造支付同步跳转地址：当前站点 + hash 路由落地页。
 * 服务端会在其后追加 payKind/payRef，支付渠道再追加 returnPageAction 等通知参数；
 * 因参数全部位于 # 之后，hash 路由可直接从 route.query 读取。
 */
export function buildClientPayReturnUrl(
  location: PayReturnLocation = window.location,
): string {
  return `${location.origin}${location.pathname}#${PAY_RETURN_ROUTE_PATH}`;
}

/** 支付回跳落地页解析出的参数 */
export interface PayReturnParams {
  kind: PayReturnKind;
  /** 业务单据标识：充值为充值单号 outTradeNo，订单为订单 id */
  ref: string;
  /** 渠道回传的页面动作；缺省视为需要查单确认 */
  action: PayReturnPageAction | null;
}

function firstString(value: LocationQuery[string] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === 'string' && single.length > 0 ? single : null;
}

function readParam(
  query: LocationQuery,
  search: URLSearchParams,
  key: string,
): string | null {
  return firstString(query[key]) ?? search.get(key);
}

const PAY_RETURN_KINDS = Object.values(PayReturnKind);
const PAY_RETURN_ACTIONS = Object.values(PayReturnPageAction);

function matchEnum<T extends string>(values: readonly T[], raw: string | null): T | null {
  return values.find((value) => value === raw) ?? null;
}

/**
 * 解析支付回跳参数：优先读 hash 路由 query，其次兼容渠道把参数拼在 # 之前的情形（location.search）。
 * 缺少业务标识或类型非法时返回 null，落地页据此展示「无法识别的支付结果」。
 */
export function parsePayReturnParams(
  query: LocationQuery,
  search: string = window.location.search,
): PayReturnParams | null {
  const params = new URLSearchParams(search);
  const kind = matchEnum(PAY_RETURN_KINDS, readParam(query, params, PAY_RETURN_QUERY_KEYS.kind));
  const ref = readParam(query, params, PAY_RETURN_QUERY_KEYS.ref);
  if (!kind || !ref) {
    return null;
  }
  return {
    kind,
    ref,
    action: matchEnum(PAY_RETURN_ACTIONS, readParam(query, params, PAY_RETURN_QUERY_KEYS.action)),
  };
}
