import type {
  CreateTenantPayload,
  PaginatedResult,
  TenantView,
  UpdateTenantPayload,
} from '@app/contracts';
import { http } from './http';

/** 租户管理接口（仅平台超管可用） */
export const tenantApi = {
  list(
    page: number,
    pageSize: number,
    keyword?: string,
  ): Promise<PaginatedResult<TenantView>> {
    return http.get('/rbac/tenants', { params: { page, pageSize, keyword } });
  },
  create(body: CreateTenantPayload): Promise<TenantView> {
    return http.post('/rbac/tenants', body);
  },
  update(id: string, body: UpdateTenantPayload): Promise<TenantView> {
    return http.patch(`/rbac/tenants/${id}`, body);
  },
  remove(id: string): Promise<void> {
    return http.delete(`/rbac/tenants/${id}`);
  },
};
