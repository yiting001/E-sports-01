import type {
  BoosterFundsView,
  BoosterMineView,
  BoosterView,
  SubmitBoosterPayload,
  UpdateBoosterAvailabilityPayload,
} from '@app/contracts';
import { http } from './http';

/** 打手入驻接口：C 端自助查询状态 / 提交（重提）申请 / 缴纳押金 */
export const boosterApi = {
  /** 当前用户入驻概览（状态 + 申请记录） */
  mine(): Promise<BoosterMineView> {
    return http.get('/booster/mine');
  },
  /** 当前打手「我的资金」聚合（押金/余额/冻结/结算/罚款） */
  fundsMine(): Promise<BoosterFundsView> {
    return http.get('/booster/funds/mine');
  },
  /** 提交/重提入驻申请 */
  apply(payload: SubmitBoosterPayload): Promise<BoosterView> {
    return http.post('/booster', payload);
  },
  /** 从钱包余额缴纳押金（区间内自选金额，仅限已入驻打手） */
  payDeposit(amountFen: number): Promise<BoosterView> {
    return http.post('/booster/deposit/pay', { amountFen });
  },
  /** 审核通过的打手自主切换是否接单。 */
  updateAvailability(payload: UpdateBoosterAvailabilityPayload): Promise<BoosterView> {
    return http.put('/booster/mine/availability', payload);
  },
};
