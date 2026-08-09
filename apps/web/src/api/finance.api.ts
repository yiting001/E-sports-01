import type {
  CreatePenaltyBody,
  PaginatedResult,
  PaginationQuery,
  PenaltyView,
  RejectWithdrawalBody,
  SaveWithdrawTaxConfigBody,
  WithdrawalAdminView,
  WithdrawalResultView,
  WithdrawalStatus,
  WithdrawalTaxExportView,
  WithdrawTaxConfigView,
} from '@app/contracts';
import { http } from './http';

/** 提现管理列表查询入参（分页 + 状态过滤） */
export interface WithdrawalAdminListQuery extends PaginationQuery {
  status?: WithdrawalStatus;
}

/** 罚款记录列表查询入参（分页 + 打手过滤） */
export interface PenaltyListQuery extends PaginationQuery {
  boosterUserId?: string;
}

/** 财务管理接口（RBAC 门控：finance:withdrawal:* / finance:penalty:*） */
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
  /** 一键导出报税表单（已到账提现单 CSV） */
  exportTaxReport(): Promise<WithdrawalTaxExportView> {
    return http.get('/wallet/admin/withdrawals/tax-export');
  },
  /** 读取税务配置（提现阶梯税费档位 + 回退单一费率） */
  getTaxConfig(): Promise<WithdrawTaxConfigView> {
    return http.get('/wallet/admin/tax-config');
  },
  /** 保存税务配置（阶梯税费档位，空数组表示清空回退单一费率） */
  saveTaxConfig(body: SaveWithdrawTaxConfigBody): Promise<WithdrawTaxConfigView> {
    return http.put('/wallet/admin/tax-config', body);
  },
  /** 分页查询罚款记录 */
  listPenalties(query: PenaltyListQuery): Promise<PaginatedResult<PenaltyView>> {
    return http.get('/finance/penalties', { params: query });
  },
  /** 对打手创建罚款（从余额或押金扣除） */
  createPenalty(body: CreatePenaltyBody): Promise<PenaltyView> {
    return http.post('/finance/penalties', body);
  },
};
