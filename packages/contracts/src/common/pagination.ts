/** 分页查询入参 */
export interface PaginationQuery {
  page: number;
  pageSize: number;
}

/** 分页查询结果 */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 分页默认值（前后端共享，避免硬编码散落各处） */
export const PAGINATION_DEFAULTS = {
  page: 1,
  pageSize: 10,
  maxPageSize: 100,
} as const;
