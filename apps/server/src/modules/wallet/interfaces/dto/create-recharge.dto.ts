import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';
import { CreateRechargeBody, PAY_RETURN_URL_MAX_LENGTH, PaymentProvider } from '@app/contracts';

/** 发起充值入参 DTO */
export class CreateRechargeDto implements CreateRechargeBody {
  /** 充值金额（分），至少 1 分；下限由配置中心进一步校验 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  /** 支付完成后同步跳回的前端地址（须为 HTTP/HTTPS 完整地址） */
  @IsOptional()
  @IsString()
  @MaxLength(PAY_RETURN_URL_MAX_LENGTH)
  @IsUrl(
    { require_tld: false, require_protocol: true, protocols: ['http', 'https'] },
    { message: '支付回跳地址无效' },
  )
  returnUrl?: string;
}
