import type {
  BoosterMineView,
  BoosterView,
  SubmitBoosterPayload,
} from '@app/contracts';
import { http } from './http';

/** 打手入驻接口：C 端自助查询状态 / 提交（重提）申请 / 缴纳押金 */
export const boosterApi = {
  /** 当前用户入驻概览（状态 + 申请记录） */
  mine(): Promise<BoosterMineView> {
    return http.get('/booster/mine');
  },
  /** 提交/重提入驻申请 */
  apply(payload: SubmitBoosterPayload): Promise<BoosterView> {
    return http.post('/booster', payload);
  },
  /** 从钱包余额缴纳剩余押金（仅限已入驻打手） */
  payDeposit(): Promise<BoosterView> {
    return http.post('/booster/deposit/pay');
  },
};
