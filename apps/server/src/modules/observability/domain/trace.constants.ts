/**
 * 链路追踪相关常量。
 * 集中定义请求头名称与上下文存储键，避免散落的魔法字符串。
 */
export const TRACE_HEADERS = {
  /** 自定义链路头：优先透传/回写 */
  traceId: 'x-trace-id',
  /** W3C Trace Context 标准头，用于兼容上游分布式追踪 */
  traceparent: 'traceparent',
} as const;
