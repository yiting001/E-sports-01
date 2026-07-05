import type { RankBoardView } from '@app/contracts';
import { http } from './http';

/** 排行榜接口：打手榜 + 消费榜 */
export const rankApi = {
  /** 查询排行榜 */
  board(): Promise<RankBoardView> {
    return http.get('/rank/board');
  },
};
