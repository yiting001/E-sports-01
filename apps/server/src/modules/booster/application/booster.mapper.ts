import { BoosterLevelTier, BoosterView, resolveBoosterLevel } from '@app/contracts';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';
import { normalizeBoosterServiceRegions } from './booster-compatibility';

/** 用户简要信息（用于在管理列表上展示申请人） */
export interface BoosterUserBrief {
  username: string;
  nickname: string;
}

/** 领域实体 → 对外视图；等级按配置档位与累计完成单数实时解析 */
export function toBoosterView(
  entity: BoosterApplicationEntity,
  tiers: BoosterLevelTier[],
  user: BoosterUserBrief = { username: '', nickname: '' },
): BoosterView {
  const tier = resolveBoosterLevel(tiers, entity.completedOrders);
  return {
    id: entity.id,
    userId: entity.userId,
    username: user.username,
    nickname: user.nickname,
    applicantName: entity.applicantName,
    gender: entity.gender,
    serviceRegions: normalizeBoosterServiceRegions(entity.serviceRegions),
    intro: entity.intro,
    contactType: entity.contactType,
    contactValue: entity.contactValue,
    materialImage: entity.materialImage,
    voiceUrl: entity.voiceUrl,
    invitationCode: entity.invitationCode,
    status: entity.status,
    rejectReason: entity.rejectReason,
    reviewedBy: entity.reviewedBy,
    reviewedAt: entity.reviewedAt ? entity.reviewedAt.toISOString() : '',
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    completedOrders: entity.completedOrders,
    level: tier.level,
    levelName: tier.name,
    commissionRateBp: tier.commissionRateBp,
    depositFen: entity.depositFen,
    acceptingOrders: entity.acceptingOrders,
  };
}
