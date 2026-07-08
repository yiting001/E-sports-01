import type {
  AdminReviewView,
  CreateMarketingReviewPayload,
  PaginatedResult,
  SetReviewVisibilityPayload,
} from '@app/contracts';
import { http } from './http';

/** 评论管理接口：管理端检索评论列表 + 隐藏/恢复 + 删除 + 营销添加 */
export const reviewApi = {
  /** 分页查询评论列表，可按星级/可见状态过滤 */
  list(
    page: number,
    pageSize: number,
    rating?: number,
    visible?: boolean,
  ): Promise<PaginatedResult<AdminReviewView>> {
    return http.get('/review', { params: { page, pageSize, rating, visible } });
  },
  /** 隐藏/恢复评论（隐藏后不在商品详情页露出） */
  setVisibility(
    id: string,
    payload: SetReviewVisibilityPayload,
  ): Promise<AdminReviewView> {
    return http.post(`/review/${id}/visibility`, payload);
  },
  /** 删除评论（硬删除，删除后该订单可重新评价） */
  remove(id: string): Promise<void> {
    return http.delete(`/review/${id}`);
  },
  /** 营销工具：为商品添加自定义评论（昵称/头像自设，无订单来源） */
  createMarketing(payload: CreateMarketingReviewPayload): Promise<AdminReviewView> {
    return http.post('/review/marketing', payload);
  },
};
