import { AddCouponDistributorPayload } from '@app/contracts';
import { IsString, MinLength } from 'class-validator';

/** 添加分发人入参校验（管理端） */
export class AddCouponDistributorDto implements AddCouponDistributorPayload {
  @IsString()
  @MinLength(1, { message: '分发人不能为空' })
  userId!: string;
}
