import { BizCode } from "@app/contracts";
import axios from "axios";

/** 刷新范围按固定分页边界向上对齐，避免后续加载更多跳过订单。 */
export function alignHallRefreshPageSize(
  loadedCount: number,
  pageSize: number,
  maxPageSize: number
): number {
  const alignedSize = Math.max(
    pageSize,
    Math.ceil(loadedCount / pageSize) * pageSize
  );
  return Math.min(maxPageSize, alignedSize);
}

/** 订单不存在或并发状态冲突时，详情应切换为不可接状态。 */
export function isHallOrderUnavailableError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }
  const status = error.response?.status;
  return status === BizCode.NotFound || status === BizCode.Conflict;
}
