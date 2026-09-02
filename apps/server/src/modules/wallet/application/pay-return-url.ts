import { BadRequestException } from '@nestjs/common';
import {
  PAY_RETURN_QUERY_KEYS,
  PAY_RETURN_REF_PLACEHOLDER,
  PAY_RETURN_URL_MAX_LENGTH,
} from '@app/contracts';

/**
 * 把业务单据标识写入前端传入的支付回跳地址，使渠道支付完成后直接跳回原业务页：
 * - 地址含 `{payRef}` 占位符（如 `…#/orders/{payRef}`）时原位替换为单据 id；
 * - 否则把 payRef 追加为 query（如 `…#/wallet?payRef=R…`）。
 * 采用纯字符串拼接而非 URL API：前端为 hash 路由，参数必须落在 # 之后才能进入路由 query，
 * 分隔符只看最后一段（有 # 时为 hash 部分）是否已带 ?，避免 `/?x=1#/wallet` 被错误拼成 `&`。
 * 未传 returnUrl 时返回 undefined（官方扫码/JSAPI 渠道不需要同步跳转）。
 */
export function buildPayReturnUrl(returnUrl: string | undefined, ref: string): string | undefined {
  if (!returnUrl) {
    return undefined;
  }
  const finalUrl = returnUrl.includes(PAY_RETURN_REF_PLACEHOLDER)
    ? returnUrl.split(PAY_RETURN_REF_PLACEHOLDER).join(encodeURIComponent(ref))
    : appendRefQuery(returnUrl, ref);
  if (finalUrl.length > PAY_RETURN_URL_MAX_LENGTH) {
    throw new BadRequestException(
      `支付回跳地址过长，写入业务参数后不得超过 ${PAY_RETURN_URL_MAX_LENGTH} 个字符`,
    );
  }
  return finalUrl;
}

function appendRefQuery(returnUrl: string, ref: string): string {
  const hashIndex = returnUrl.indexOf('#');
  const tail = hashIndex >= 0 ? returnUrl.slice(hashIndex) : returnUrl;
  const separator = tail.includes('?') ? '&' : '?';
  const query = new URLSearchParams({ [PAY_RETURN_QUERY_KEYS.ref]: ref }).toString();
  return `${returnUrl}${separator}${query}`;
}
