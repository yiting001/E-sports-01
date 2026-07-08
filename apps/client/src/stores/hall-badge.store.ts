import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/stores/auth.store';
import { defineBadgeStore } from '@/stores/badge-store.factory';
import { useRoleStore } from '@/stores/role.store';

/** 探测大厅待接单总数时的最小分页参数（只取 total，不消费列表） */
const PROBE_PAGE = 1;
const PROBE_PAGE_SIZE = 1;

/**
 * 接单大厅待接单数状态。
 * 汇总大厅待接订单总数，供打手身份导航「接单大厅」入口角标展示；
 * 非打手身份或未登录时清零，不发起请求。
 */
export const useHallBadgeStore = defineBadgeStore('hall-badge', async () => {
  const auth = useAuthStore();
  const role = useRoleStore();
  if (!auth.isAuthenticated || !role.isBoosterMode) {
    return 0;
  }
  const result = await orderApi.hall(PROBE_PAGE, PROBE_PAGE_SIZE);
  return result.total;
});
