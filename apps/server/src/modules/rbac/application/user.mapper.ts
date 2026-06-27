import { UserStatusEnum, UserView } from '@app/contracts';
import { User } from '../domain/user.entity';

/** 领域用户实体 → 对外视图（剔除密码等敏感字段） */
export function toUserView(user: User, tenantCode = ''): UserView {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    phone: user.phone,
    status: user.status as unknown as UserStatusEnum,
    roles: (user.roles ?? []).map((r) => ({ id: r.id, code: r.code, name: r.name })),
    tenantCode,
    createdAt: user.createdAt.toISOString(),
  };
}
