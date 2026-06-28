import type {
  PaginatedResult,
  RealnameMineView,
  RealnamePolicyView,
  RealnameStatus,
  RealnameView,
  ReviewRealnamePayload,
  SetRealnamePolicyPayload,
  SubmitRealnamePayload,
} from '@app/contracts';
import { http } from './http';

/** 实名认证接口：自助提交/查看 + 管理端审核与策略配置 */
export const realnameApi = {
  /** 当前用户实名概览（是否需实名 + 当前状态/记录） */
  mine(): Promise<RealnameMineView> {
    return http.get('/realname/mine');
  },
  /** 提交/重提实名认证 */
  submit(payload: SubmitRealnamePayload): Promise<RealnameView> {
    return http.post('/realname', payload);
  },
  /** 分页查询审核列表，可按状态过滤 */
  list(
    page: number,
    pageSize: number,
    status?: RealnameStatus,
  ): Promise<PaginatedResult<RealnameView>> {
    return http.get('/realname', { params: { page, pageSize, status } });
  },
  /** 审核（通过/驳回） */
  review(id: string, payload: ReviewRealnamePayload): Promise<RealnameView> {
    return http.post(`/realname/${id}/review`, payload);
  },
  /** 读取实名策略 */
  getPolicy(): Promise<RealnamePolicyView> {
    return http.get('/realname/policy');
  },
  /** 设置实名策略 */
  setPolicy(payload: SetRealnamePolicyPayload): Promise<RealnamePolicyView> {
    return http.put('/realname/policy', payload);
  },
};
