import type { MemberLevelTier } from '@app/contracts';
import { http } from './http';

/** 会员等级接口：档位查询 / 管理端档位配置 */
export const memberApi = {
  /** 查询会员等级档位 */
  getLevels(): Promise<MemberLevelTier[]> {
    return http.get('/member/levels');
  },
  /** 保存会员等级档位（member:level:set） */
  setLevels(tiers: MemberLevelTier[]): Promise<MemberLevelTier[]> {
    return http.put('/member/levels', { tiers });
  },
};
