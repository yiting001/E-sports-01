import type {
  BoosterStatus,
  BoosterView,
  PaginatedResult,
  ReviewBoosterPayload,
  UpdateBoosterPayload,
} from '@app/contracts';
import { http } from './http';

/** 打手入驻接口：管理端审核列表 / 审核 / 资料编辑 */
export const boosterApi = {
  /** 分页查询入驻申请，可按状态过滤 */
  list(
    page: number,
    pageSize: number,
    status?: BoosterStatus,
  ): Promise<PaginatedResult<BoosterView>> {
    return http.get('/booster', { params: { page, pageSize, status } });
  },
  /** 审核（通过即授予 booster 角色 / 驳回） */
  review(id: string, payload: ReviewBoosterPayload): Promise<BoosterView> {
    return http.post(`/booster/${id}/review`, payload);
  },
  /** 编辑打手资料（仅更新传入字段） */
  update(id: string, payload: UpdateBoosterPayload): Promise<BoosterView> {
    return http.put(`/booster/${id}`, payload);
  },
};
