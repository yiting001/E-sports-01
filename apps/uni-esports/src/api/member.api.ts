import type { MemberMineView } from '@app/contracts';
import { http } from './http';

/** 会员等级接口：查询当前用户等级/折扣（下单计价用） */
export const memberApi = {
  /** 当前用户会员等级概览（含 discountBp 万分比折扣） */
  mine(): Promise<MemberMineView> {
    return http.get('/member/mine', { silent: true });
  },
};
