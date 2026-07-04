import type {
  FeedbackView,
  PaginatedResult,
  SubmitFeedbackPayload,
} from '@app/contracts';
import { http } from './http';

/** C 端反馈接口：提交投诉反馈 + 查看自己的反馈处理进度 */
export const feedbackApi = {
  /** 提交反馈/投诉 */
  submit(payload: SubmitFeedbackPayload): Promise<FeedbackView> {
    return http.post('/feedback', payload);
  },

  /** 分页查询我的反馈 */
  mine(page: number, pageSize: number): Promise<PaginatedResult<FeedbackView>> {
    return http.get('/feedback/mine', { params: { page, pageSize } });
  },
};
