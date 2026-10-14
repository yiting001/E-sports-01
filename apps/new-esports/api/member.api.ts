import type { MemberLevelTier, MemberMineView } from '@/types/member';
import { http } from './http';

/** 会员等级接口：C 端查询当前用户等级/折扣/晋升进度与档位规则 */
export const memberApi = {
  /** 当前用户会员等级概览 */
  mine(): Promise<MemberMineView> {
    return http.get('/member/mine', { silent: true });
  },

  /** 会员等级档位规则（需登录，档位由管理端配置） */
  levels(): Promise<MemberLevelTier[]> {
    return http.get('/member/levels', { silent: true });
  },
};
