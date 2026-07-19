import type { BoosterGender, BoosterServiceRegion } from '@app/contracts';

export const BOOSTER_DIRECTORY_QUERY = Symbol('BOOSTER_DIRECTORY_QUERY');

/** 打手目录的跨聚合只读记录，仅包含允许进入公开投影的字段。 */
export interface BoosterDirectoryRecord {
  userId: string;
  nickname: string;
  avatar: string;
  gender: BoosterGender | '';
  serviceRegions: BoosterServiceRegion[];
  intro: string;
  completedOrders: number;
  voiceUrl: string;
  acceptingOrders: boolean;
}

export interface BoosterDirectoryFilter {
  keyword?: string;
  gender?: BoosterGender;
  serviceRegion?: BoosterServiceRegion;
}

/** 管理端指派选择器所需的最小用户投影。 */
export interface BoosterCandidateRecord {
  id: string;
  username: string;
  nickname: string;
}

/** 打手目录 CQRS 查询端口；实现负责 approved/RBAC/用户状态/租户的交集。 */
export interface BoosterDirectoryQuery {
  paginate(
    skip: number,
    take: number,
    filter: BoosterDirectoryFilter,
  ): Promise<[BoosterDirectoryRecord[], number]>;
  findByUserId(userId: string, tenantId?: string): Promise<BoosterDirectoryRecord | null>;
  paginateAvailableCandidates(
    skip: number,
    take: number,
    keyword?: string,
  ): Promise<[BoosterCandidateRecord[], number]>;
}
