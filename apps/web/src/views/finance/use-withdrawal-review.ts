import { ref, type Ref } from 'vue';
import {
  PAYOUT_PROVIDER_TEXT,
  WithdrawalStatus,
  type WithdrawalAdminView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { financeApi } from '@/api/finance.api';

/** 提现审核动作依赖：动作完成后刷新列表并回写当前详情 */
export interface WithdrawalReviewDeps {
  reload(): Promise<void>;
  syncCurrent(id: string): void;
}

/** 提示转账结果：成功 / 转账中（等待渠道回调或同步）/ 失败（余额已退回） */
export function notifyTransferResult(status: WithdrawalStatus, failReason: string | null): void {
  if (status === WithdrawalStatus.Success) {
    ElMessage.success('转账成功，已到账');
  } else if (status === WithdrawalStatus.Processing) {
    ElMessage.info('渠道转账中，结果将由渠道通知或手动同步后更新');
  } else {
    ElMessage.error(`转账失败，余额已退回：${failReason ?? ''}`);
  }
}

/** 触发浏览器下载 CSV（加 BOM 保证 Excel 中文不乱码） */
function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * 提现管理页动作：审核通过（按执行渠道发起转账）、主动同步渠道状态、驳回、导出报税表单。
 * 审核通过后渠道可能返回「转账中」，此时提示财务等待渠道通知或手动同步，不视为失败。
 */
export function useWithdrawalReview(deps: WithdrawalReviewDeps): {
  exporting: Ref<boolean>;
  syncingId: Ref<string | null>;
  approve(row: WithdrawalAdminView): Promise<void>;
  syncChannel(row: WithdrawalAdminView): Promise<void>;
  reject(row: WithdrawalAdminView): Promise<void>;
  exportTaxReport(): Promise<void>;
} {
  const exporting = ref(false);
  const syncingId = ref<string | null>(null);

  async function refresh(id: string): Promise<void> {
    await deps.reload();
    deps.syncCurrent(id);
  }

  async function approve(row: WithdrawalAdminView): Promise<void> {
    await ElMessageBox.confirm(
      `确认通过 ${row.nickname || row.username} 的提现申请？将立即通过「${PAYOUT_PROVIDER_TEXT[row.provider]}」向 ${row.account}（${row.accountName}）转账 ¥${row.arriveYuan}。`,
      '审核通过',
      { type: 'warning' },
    );
    const result = await financeApi.approve(row.id);
    notifyTransferResult(result.status, result.failReason);
    await refresh(row.id);
  }

  async function syncChannel(row: WithdrawalAdminView): Promise<void> {
    syncingId.value = row.id;
    try {
      const result = await financeApi.sync(row.id);
      notifyTransferResult(result.status, result.failReason);
    } finally {
      syncingId.value = null;
    }
    await refresh(row.id);
  }

  async function reject(row: WithdrawalAdminView): Promise<void> {
    const { value } = await ElMessageBox.prompt(
      `请输入驳回 ${row.nickname || row.username} 提现申请的理由（金额将全额退回余额）`,
      '驳回提现',
      { inputPattern: /\S+/, inputErrorMessage: '驳回理由不能为空' },
    );
    await financeApi.reject(row.id, { reason: value });
    ElMessage.success('已驳回并退回余额');
    await refresh(row.id);
  }

  async function exportTaxReport(): Promise<void> {
    exporting.value = true;
    try {
      const result = await financeApi.exportTaxReport();
      if (result.count === 0) {
        ElMessage.info('暂无已到账的提现单可导出');
        return;
      }
      downloadCsv(result.filename, result.csv);
      ElMessage.success(`已导出 ${result.count} 条报税记录`);
    } finally {
      exporting.value = false;
    }
  }

  return { exporting, syncingId, approve, syncChannel, reject, exportTaxReport };
}
