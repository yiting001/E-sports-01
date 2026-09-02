import { PAY_RETURN_QUERY_KEYS, PAY_RETURN_REF_PLACEHOLDER } from '@app/contracts';
import type { LocationQuery } from 'vue-router';

/** 订单支付完成后的回跳目标：订单详情（服务端把 {payRef} 替换为订单 id） */
export const ORDER_PAY_RETURN_PATH = `/orders/${PAY_RETURN_REF_PLACEHOLDER}`;

/** 构造回跳地址所需的页面位置信息（便于单测注入） */
export interface PayReturnLocation {
  readonly origin: string;
  readonly pathname: string;
}

/**
 * 构造支付同步跳转地址：当前站点 + hash 路由目标页，与官方渠道支付成功后的落点保持一致
 * （下单 → 订单详情，充值 → 发起充值的页面）。
 * 服务端会替换 {payRef} 占位符或追加 payRef，支付渠道再追加 returnPageAction 等通知参数；
 * 参数全部位于 # 之后，目标页可直接从 route.query 读取。
 */
export function buildClientPayReturnUrl(
  routePath: string,
  location: PayReturnLocation = window.location,
): string {
  return `${location.origin}${location.pathname}#${routePath}`;
}

function firstString(value: LocationQuery[string] | undefined): string | null {
  const single = Array.isArray(value) ? value[0] : value;
  return typeof single === 'string' && single.length > 0 ? single : null;
}

/** 目标页是否由支付渠道同步跳转而来（计全付会追加 returnPageAction） */
export function isPayReturnVisit(query: LocationQuery): boolean {
  return firstString(query[PAY_RETURN_QUERY_KEYS.action]) !== null;
}

/**
 * 读取服务端追加到回跳地址的充值单号（payRef）。
 * 优先读 hash 路由 query，其次兼容渠道把参数拼在 # 之前的情形（location.search）。
 */
export function readPayReturnRef(
  query: LocationQuery,
  search: string = window.location.search,
): string | null {
  return (
    firstString(query[PAY_RETURN_QUERY_KEYS.ref]) ??
    new URLSearchParams(search).get(PAY_RETURN_QUERY_KEYS.ref)
  );
}

/** 去掉回跳相关 query（payRef/returnPageAction），避免刷新页面时重复触发查单 */
export function stripPayReturnQuery(query: LocationQuery): LocationQuery {
  const rest = { ...query };
  delete rest[PAY_RETURN_QUERY_KEYS.ref];
  delete rest[PAY_RETURN_QUERY_KEYS.action];
  return rest;
}
