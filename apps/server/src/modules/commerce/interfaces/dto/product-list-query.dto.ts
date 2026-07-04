import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ProductStatus } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 管理端商品列表查询：分页之上叠加分类、状态、关键字过滤 */
export class ProductListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  keyword?: string;
}
