import { AdminReviewView, ReviewPublicView } from '@app/contracts';
import { ReviewEntity } from '../domain/review.entity';

/** 评论人简要信息（管理端展示 / 公开视图脱敏来源） */
export interface ReviewUserBrief {
  username: string;
  nickname: string;
}

/** 姓名脱敏：保留首尾字符，中间以 * 代替（如「小明同学」→「小**学」） */
export function maskName(name: string): string {
  if (name.length <= 1) {
    return '匿名用户';
  }
  if (name.length === 2) {
    return `${name[0]}*`;
  }
  return `${name[0]}${'*'.repeat(name.length - 2)}${name[name.length - 1]}`;
}

/** 领域实体 → 公开视图（商品详情页，昵称脱敏） */
export function toReviewPublicView(
  entity: ReviewEntity,
  user: ReviewUserBrief = { username: '', nickname: '' },
): ReviewPublicView {
  return {
    id: entity.id,
    reviewerName: entity.reviewerName || maskName(user.nickname || user.username),
    avatar: entity.avatar,
    rating: entity.rating,
    content: entity.content,
    createdAt: entity.createdAt.toISOString(),
  };
}

/** 领域实体 → 管理端视图 */
export function toAdminReviewView(
  entity: ReviewEntity,
  user: ReviewUserBrief = { username: '', nickname: '' },
): AdminReviewView {
  return {
    id: entity.id,
    userId: entity.userId,
    username: user.username,
    nickname: user.nickname,
    reviewerName: entity.reviewerName,
    avatar: entity.avatar,
    orderId: entity.orderId ?? '',
    orderNo: entity.orderNo,
    productId: entity.productId,
    productTitle: entity.productTitle,
    rating: entity.rating,
    content: entity.content,
    visible: entity.visible,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
