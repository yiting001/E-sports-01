import { IsEnum, IsInt, IsString, Length, Min } from 'class-validator';
import { CreateWithdrawalBody, PayoutProvider } from '@app/contracts';

/** 发起提现入参 DTO */
export class CreateWithdrawalDto implements CreateWithdrawalBody {
  /** 提现金额（分），至少 1 分；下限由配置中心进一步校验 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  @IsEnum(PayoutProvider)
  provider!: PayoutProvider;

  /** 收款方支付宝登录号（邮箱/手机号） */
  @IsString()
  @Length(1, 128)
  account!: string;

  /** 收款方真实姓名 */
  @IsString()
  @Length(1, 64)
  accountName!: string;
}
