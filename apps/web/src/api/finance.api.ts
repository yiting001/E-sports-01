import type {
  PaginatedResult,
  PaginationQuery,
  RejectWithdrawalBody,
  WithdrawalAdminView,
  WithdrawalResultView,
  WithdrawalStatus,
} from '@app/contracts';
import { http } from './http';

/** 提现管理列表查询入参（分页 + 状态过滤） */
export interface WithdrawalAdminListQuery extends PaginationQuery {
  status?: WithdrawalStatus;
}

/** 财务提现管理接口（RBAC 门控：finance:withdrawal:*） */
export const financeApi = {
  /** 分页查询提现工单 */
  listWithdrawals(
    query: WithdrawalAdminListQuery,
  ): Promise<PaginatedResult<WithdrawalAdminView>> {
    return http.get('/wallet/admin/withdrawals', { params: query });
  },
  /** 审核通过：发起支付宝转账到收款账号 */
  approve(id: string): Promise<WithdrawalResultView> {
    return http.post(`/wallet/admin/withdrawals/${id}/approve`);
  },
  /** 驳回：退回余额并留存驳回原因 */
  reject(id: string, body: RejectWithdrawalBody): Promise<WithdrawalResultView> {
    return http.post(`/wallet/admin/withdrawals/${id}/reject`, body);
  },
};
