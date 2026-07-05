import type {
  BoosterStatsView,
  FinanceStatsView,
  OrderStatsView,
  StatsRange,
  UserStatsView,
} from '@app/contracts';
import { http } from './http';

/** 仪表盘统计接口：按业务域分块拉取，range 为日/月/年档位 */
export const dashboardApi = {
  /** 订单运营统计（dashboard:orders） */
  orders(range: StatsRange): Promise<OrderStatsView> {
    return http.get('/dashboard/orders', { params: { range } });
  },
  /** 财务资金统计（dashboard:finance） */
  finance(range: StatsRange): Promise<FinanceStatsView> {
    return http.get('/dashboard/finance', { params: { range } });
  },
  /** 用户增长统计（dashboard:users） */
  users(range: StatsRange): Promise<UserStatsView> {
    return http.get('/dashboard/users', { params: { range } });
  },
  /** 打手生态统计（dashboard:boosters） */
  boosters(range: StatsRange): Promise<BoosterStatsView> {
    return http.get('/dashboard/boosters', { params: { range } });
  },
};
