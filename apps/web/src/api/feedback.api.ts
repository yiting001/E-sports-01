import type {
  CreateFeedbackPenaltyBody,
  FeedbackStatus,
  FeedbackType,
  FeedbackView,
  HandleFeedbackPayload,
  PaginatedResult,
} from '@app/contracts';
import { http } from './http';

/** 反馈管理接口：管理端检索反馈列表 + 填写处理回复 */
export const feedbackApi = {
  /** 分页查询反馈列表，可按状态/类型过滤 */
  list(
    page: number,
    pageSize: number,
    status?: FeedbackStatus,
    type?: FeedbackType,
  ): Promise<PaginatedResult<FeedbackView>> {
    return http.get('/feedback', { params: { page, pageSize, status, type } });
  },
  /** 处理反馈（填写处理回复并标记已处理） */
  handle(id: string, payload: HandleFeedbackPayload): Promise<FeedbackView> {
    return http.post(`/feedback/${id}/handle`, payload);
  },
  /** 根据结构化打手投诉创建罚款，并同步完成反馈回复 */
  createPenalty(id: string, payload: CreateFeedbackPenaltyBody): Promise<FeedbackView> {
    return http.post(`/feedback/${id}/penalty`, payload);
  },
};
