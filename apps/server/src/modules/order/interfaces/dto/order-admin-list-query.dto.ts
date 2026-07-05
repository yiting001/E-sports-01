import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 管理端订单列表查询：在通用分页之上增加可选状态/订单号过滤 */
export class OrderAdminListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  orderNo?: string;
}
