import { IsEnum, IsOptional } from 'class-validator';
import { OrderStatus } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 我的订单列表查询：在通用分页之上增加可选状态过滤（tabs 切换） */
export class OrderMineListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
