import { IsEnum, IsInt, Min } from 'class-validator';
import { CreateRechargeBody, PaymentProvider } from '@app/contracts';

/** 发起充值入参 DTO */
export class CreateRechargeDto implements CreateRechargeBody {
  /** 充值金额（分），至少 1 分；下限由配置中心进一步校验 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;
}
