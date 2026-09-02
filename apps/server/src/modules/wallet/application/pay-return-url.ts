import { BadRequestException } from '@nestjs/common';
import {
  PAY_RETURN_QUERY_KEYS,
  PAY_RETURN_URL_MAX_LENGTH,
  PayReturnKind,
} from '@app/contracts';

/**
 * 在前端传入的支付回跳地址上追加业务单据标识（payKind/payRef），
 * 供 C 端落地页确认支付结果并跳转。
 * 采用纯字符串拼接而非 URL API：前端为 hash 路由（…/#/pay/return），
 * 参数必须追加在地址末尾才能落进路由 query，这与计全付自身拼接 returnPageAction 的方式一致。
 * 分隔符只看最后一段（有 # 时为 hash 部分）是否已带 ?，避免 `/?x=1#/pay/return` 这类地址被错误拼成 `&`。
 * 未传 returnUrl 时返回 undefined（官方扫码/JSAPI 渠道不需要同步跳转）。
 */
export function buildPayReturnUrl(
  returnUrl: string | undefined,
  kind: PayReturnKind,
  ref: string,
): string | undefined {
  if (!returnUrl) {
    return undefined;
  }
  const hashIndex = returnUrl.indexOf('#');
  const tail = hashIndex >= 0 ? returnUrl.slice(hashIndex) : returnUrl;
  const separator = tail.includes('?') ? '&' : '?';
  const query = new URLSearchParams({
    [PAY_RETURN_QUERY_KEYS.kind]: kind,
    [PAY_RETURN_QUERY_KEYS.ref]: ref,
  }).toString();
  const finalUrl = `${returnUrl}${separator}${query}`;
  if (finalUrl.length > PAY_RETURN_URL_MAX_LENGTH) {
    throw new BadRequestException(
      `支付回跳地址过长，拼接业务参数后不得超过 ${PAY_RETURN_URL_MAX_LENGTH} 个字符`,
    );
  }
  return finalUrl;
}
