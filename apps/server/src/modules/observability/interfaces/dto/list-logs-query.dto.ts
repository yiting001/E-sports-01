import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';
import { LogLevel, LogType } from '@app/contracts';
import { PaginationQueryDto } from '../../../../shared/http/pagination.dto';
import { LogFilter } from '../../domain/log-record';

/** 日志列表查询 DTO（分页 + 多条件筛选） */
export class ListLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LogLevel)
  level?: LogLevel;

  @IsOptional()
  @IsEnum(LogType)
  type?: LogType;

  @IsOptional()
  @IsString()
  traceId?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @IsOptional()
  @IsISO8601()
  endTime?: string;

  /** 转换为领域过滤条件（时间字符串解析为 Date） */
  toFilter(): LogFilter {
    return {
      level: this.level,
      type: this.type,
      traceId: this.traceId,
      path: this.path,
      userId: this.userId,
      startTime: this.startTime ? new Date(this.startTime) : undefined,
      endTime: this.endTime ? new Date(this.endTime) : undefined,
    };
  }
}
