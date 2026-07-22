import { MemberProfileEntity } from './member-profile.entity';

export const MEMBER_REPOSITORY = Symbol('MEMBER_REPOSITORY');

/** 会员档案仓储接口（领域层只依赖抽象，实现在基础设施层） */
export interface MemberRepository {
  /** 按用户取会员档案（按租户上下文过滤） */
  findByUserId(userId: string): Promise<MemberProfileEntity | null>;
  create(data: Partial<MemberProfileEntity>): MemberProfileEntity;
  save(entity: MemberProfileEntity): Promise<MemberProfileEntity>;
}
