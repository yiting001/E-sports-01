import { PenaltyView, fenToYuan } from '@app/contracts';
import { BoosterPenaltyEntity } from '../domain/booster-penalty.entity';
import { BoosterUserBrief } from './booster.mapper';

/** 罚款记录实体 → 对外视图 */
export function toPenaltyView(
  entity: BoosterPenaltyEntity,
  user: BoosterUserBrief = { username: '', nickname: '' },
): PenaltyView {
  return {
    id: entity.id,
    boosterUserId: entity.boosterUserId,
    username: user.username,
    nickname: user.nickname,
    orderNo: entity.orderNo,
    amountFen: entity.amountFen,
    amountYuan: fenToYuan(entity.amountFen),
    source: entity.source,
    reason: entity.reason,
    createdBy: entity.createdBy,
    createdAt: entity.createdAt.toISOString(),
  };
}
