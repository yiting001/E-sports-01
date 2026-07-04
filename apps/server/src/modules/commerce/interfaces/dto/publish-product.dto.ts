import { IsEnum } from 'class-validator';
import { ProductStatus, PublishProductPayload } from '@app/contracts';

/** 商品上下架入参 */
export class PublishProductDto implements PublishProductPayload {
  @IsEnum(ProductStatus)
  status!: ProductStatus;
}
