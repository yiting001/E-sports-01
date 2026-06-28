import { RealnameView } from '@app/contracts';
import { RealnameAuthEntity } from '../domain/realname-auth.entity';

/** 用户简要信息（用于在审核列表上展示提交人） */
export interface RealnameUserBrief {
  username: string;
  nickname: string;
}

/** 领域实体 → 对外脱敏视图（不含身份证明文与密文） */
export function toRealnameView(
  entity: RealnameAuthEntity,
  user: RealnameUserBrief = { username: '', nickname: '' },
): RealnameView {
  return {
    id: entity.id,
    userId: entity.userId,
    username: user.username,
    nickname: user.nickname,
    realName: entity.realName,
    idCardMasked: entity.idCardMasked,
    frontImage: entity.frontImage,
    backImage: entity.backImage,
    status: entity.status,
    rejectReason: entity.rejectReason,
    reviewedBy: entity.reviewedBy,
    reviewedAt: entity.reviewedAt ? entity.reviewedAt.toISOString() : '',
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
