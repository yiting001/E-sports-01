import { BoosterView } from '@app/contracts';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';

/** 用户简要信息（用于在管理列表上展示申请人） */
export interface BoosterUserBrief {
  username: string;
  nickname: string;
}

/** 领域实体 → 对外视图 */
export function toBoosterView(
  entity: BoosterApplicationEntity,
  user: BoosterUserBrief = { username: '', nickname: '' },
): BoosterView {
  return {
    id: entity.id,
    userId: entity.userId,
    username: user.username,
    nickname: user.nickname,
    gameNickname: entity.gameNickname,
    gameName: entity.gameName,
    rank: entity.rank,
    intro: entity.intro,
    status: entity.status,
    rejectReason: entity.rejectReason,
    reviewedBy: entity.reviewedBy,
    reviewedAt: entity.reviewedAt ? entity.reviewedAt.toISOString() : '',
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
