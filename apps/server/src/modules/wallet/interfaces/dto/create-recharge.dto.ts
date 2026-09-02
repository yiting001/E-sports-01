import { IsIn, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import {
  CreateRechargeBody,
  PAY_RETURN_URL_MAX_LENGTH,
  PaymentProvider,
  RECHARGE_PAYMENT_PROVIDERS,
} from '@app/contracts';

/** 发起充值入参 DTO */
export class CreateRechargeDto implements CreateRechargeBody {
  /** 充值金额（分），至少 1 分；下限由配置中心进一步校验 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  /** 支付方式：支付宝/微信扫码/微信公众号 JSAPI（计全付渠道由服务端按网关开关映射） */
  @IsIn(RECHARGE_PAYMENT_PROVIDERS)
  provider!: PaymentProvider;

  /** 支付完成后同步跳回的前端地址（须为 HTTP/HTTPS 完整地址；服务端会追加充值单标识后透传计全付） */
  @IsOptional()
  @IsString()
  @MaxLength(PAY_RETURN_URL_MAX_LENGTH)
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: '支付回跳地址无效' },
  )
  returnUrl?: string;
}
