import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';

/** 一天的毫秒数，用于把截止日期扩展到当天末尾 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 聊天记录搜索查询：会话必填，关键词与日期范围（YYYY-MM-DD，闭区间）可选。
 * 在通用分页之上扩展，日期在此处统一换算为时间点，用例层不再关心格式。
 */
export class SearchMessagesQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty()
  conversationId!: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  /** 起始时间：起始日当天零点 */
  get from(): Date | undefined {
    return this.dateFrom ? new Date(this.dateFrom) : undefined;
  }

  /** 截止时间：截止日当天最后一毫秒（闭区间语义） */
  get to(): Date | undefined {
    if (!this.dateTo) {
      return undefined;
    }
    return new Date(new Date(this.dateTo).getTime() + DAY_MS - 1);
  }
}
