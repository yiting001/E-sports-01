import type { MemberMineView } from '@app/contracts';
import { http } from './http';

/** 会员等级接口：C 端查询当前用户等级/折扣/晋升进度 */
export const memberApi = {
  /** 当前用户会员等级概览 */
  mine(): Promise<MemberMineView> {
    return http.get('/member/mine');
  },
};
