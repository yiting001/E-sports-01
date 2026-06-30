import { PAGINATION_DEFAULTS } from '@app/contracts';

/** 前端分页条数选项，集中管理，避免页面内散落硬编码。 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, PAGINATION_DEFAULTS.maxPageSize] as const;
