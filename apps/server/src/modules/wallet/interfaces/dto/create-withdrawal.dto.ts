import { IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import {
  CreateWithdrawalBody,
  ID_CARD_NO_PATTERN,
  PayoutProvider,
} from '@app/contracts';

/** 发起提现入参 DTO */
export class CreateWithdrawalDto implements CreateWithdrawalBody {
  /** 提现金额（分），至少 1 分；下限由配置中心进一步校验 */
  @IsInt()
  @Min(1)
  amountFen!: number;

  @IsEnum(PayoutProvider)
  provider!: PayoutProvider;

  /** 收款方支付宝登录号（邮箱/手机号）；微信零钱无需填写，服务端取绑定的 openid */
  @IsOptional()
  @IsString()
  @Length(1, 128)
  account?: string;

  /** 收款方真实姓名 */
  @IsString()
  @Length(1, 64)
  accountName!: string;

  /** 收款方身份证号（报税用，18 位） */
  @IsString()
  @Matches(ID_CARD_NO_PATTERN, { message: '身份证号格式不正确' })
  idCardNo!: string;
}
