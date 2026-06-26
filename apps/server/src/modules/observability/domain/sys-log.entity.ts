import { LogLevel, LogType } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 系统日志聚合根。
 * 访问日志 / 异常日志 / 应用日志统一落到此表，以 traceId 串联同一请求的全链路。
 * 仅追加写入，查询接口按时间倒序分页，清理接口按保留天数删除过期记录。
 */
@Entity('sys_log')
export class SysLog extends BaseEntity {
  /** 链路 ID：同一请求内所有日志共享，按其检索可还原整条调用链 */
  @Index()
  @Column({ name: 'trace_id', length: 64 })
  traceId!: string;

  /** 跨度 ID：单个处理片段的标识 */
  @Column({ name: 'span_id', length: 32, default: '' })
  spanId!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: LogLevel.Info })
  level!: LogLevel;

  @Index()
  @Column({ type: 'varchar', length: 16, default: LogType.App })
  type!: LogType;

  /** 日志来源上下文（类名/模块名） */
  @Column({ length: 64, default: '' })
  context!: string;

  @Column({ type: 'text', default: '' })
  message!: string;

  @Column({ length: 8, default: '' })
  method!: string;

  @Index()
  @Column({ length: 255, default: '' })
  path!: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @Index()
  @Column({ name: 'user_id', type: 'varchar', length: 64, nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  username!: string | null;

  @Column({ length: 64, default: '' })
  ip!: string;

  @Column({ name: 'user_agent', length: 255, default: '' })
  userAgent!: string;

  /** 异常堆栈（仅错误日志有值） */
  @Column({ type: 'text', nullable: true })
  stack!: string | null;
}
