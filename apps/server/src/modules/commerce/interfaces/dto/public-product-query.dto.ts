import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** C 端商品列表查询：分页之上叠加分类、关键字过滤（仅上架商品） */
export class PublicProductQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
