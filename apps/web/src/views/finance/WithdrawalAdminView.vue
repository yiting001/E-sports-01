<script setup lang="ts">
/**
 * 提现管理页（菜单 finance:withdrawal:menu，财务分组）。
 * 分页展示用户提现工单（可按状态过滤），展示金额/手续费/到账额与收款支付宝账户；
 * 支持审核通过（立即发起支付宝转账到账）与驳回（填写理由，全额退回余额）。
 */
import { onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PERMS,
  PayoutProvider,
  WITHDRAWAL_STATUS_TEXT,
  WithdrawalStatus,
  type WithdrawalAdminView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Check, Close, Download, Money, Refresh, Search, View } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { financeApi } from '@/api/finance.api';
import './WithdrawalAdminView.css';

const list = ref<WithdrawalAdminView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<WithdrawalStatus | undefined>(undefined);
const loading = ref(false);
const exporting = ref(false);
const detailVisible = ref(false);
const currentWithdrawal = ref<WithdrawalAdminView | null>(null);

const payoutProviderText: Record<PayoutProvider, string> = {
  [PayoutProvider.Alipay]: '支付宝',
  [PayoutProvider.Wechat]: '微信',
};

const statusTagType: Record<
  WithdrawalStatus,
  'info' | 'warning' | 'success' | 'danger'
> = {
  [WithdrawalStatus.Pending]: 'warning',
  [WithdrawalStatus.Processing]: 'info',
  [WithdrawalStatus.Success]: 'success',
  [WithdrawalStatus.Failed]: 'danger',
  [WithdrawalStatus.Rejected]: 'danger',
};

const statusOptions = [
  { label: '全部状态', value: undefined },
  ...Object.values(WithdrawalStatus).map((status) => ({
    label: WITHDRAWAL_STATUS_TEXT[status],
    value: status,
  })),
];

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await financeApi.listWithdrawals({
      page: page.value,
      pageSize: pageSize.value,
      status: statusFilter.value,
    });
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function onFilterChange(): Promise<void> {
  page.value = 1;
  await load();
}

function openDetail(row: WithdrawalAdminView): void {
  currentWithdrawal.value = row;
  detailVisible.value = true;
}

function syncCurrentWithdrawal(id: string): void {
  const latest = list.value.find((item) => item.id === id) ?? null;
  currentWithdrawal.value = latest;
  detailVisible.value = latest !== null;
}

/** 一键导出报税表单：拉取已到账提现单 CSV，加 BOM 生成文件下载（Excel 中文不乱码） */
async function exportTaxReport(): Promise<void> {
  exporting.value = true;
  try {
    const result = await financeApi.exportTaxReport();
    if (result.count === 0) {
      ElMessage.info('暂无已到账的提现单可导出');
      return;
    }
    const blob = new Blob([`\uFEFF${result.csv}`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = result.filename;
    link.click();
    URL.revokeObjectURL(url);
    ElMessage.success(`已导出 ${result.count} 条报税记录`);
  } finally {
    exporting.value = false;
  }
}

async function approve(row: WithdrawalAdminView): Promise<void> {
  await ElMessageBox.confirm(
    `确认通过 ${row.nickname || row.username} 的提现申请？将立即向支付宝账号 ${row.account}（${row.accountName}）转账 ¥${row.arriveYuan}。`,
    '审核通过',
    { type: 'warning' },
  );
  const result = await financeApi.approve(row.id);
  if (result.status === WithdrawalStatus.Success) {
    ElMessage.success('已通过，转账成功');
  } else {
    ElMessage.error(`转账失败，余额已退回：${result.failReason ?? ''}`);
  }
  await load();
  syncCurrentWithdrawal(row.id);
}

async function reject(row: WithdrawalAdminView): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    `请输入驳回 ${row.nickname || row.username} 提现申请的理由（金额将全额退回余额）`,
    '驳回提现',
    { inputPattern: /\S+/, inputErrorMessage: '驳回理由不能为空' },
  );
  await financeApi.reject(row.id, { reason: value });
  ElMessage.success('已驳回并退回余额');
  await load();
  syncCurrentWithdrawal(row.id);
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page withdrawal-page">
    <app-panel
      title="用户提现管理"
      eyebrow="Withdrawal Review"
    >
      <template #actions>
        <div class="admin-actions">
          <el-select
            v-model="statusFilter"
            class="withdrawal-filter"
            placeholder="按状态筛选"
            :prefix-icon="Search"
            @change="onFilterChange"
          >
            <el-option
              v-for="opt in statusOptions"
              :key="opt.value ?? 'all'"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-button
            :icon="Refresh"
            @click="load"
          >
            刷新
          </el-button>
          <el-button
            v-permission="PERMS.finance.withdrawalList"
            type="primary"
            :icon="Download"
            :loading="exporting"
            @click="exportTaxReport"
          >
            导出报税表单
          </el-button>
        </div>
      </template>

      <app-data-table
        :data="list"
        :loading="loading"
        :min-width="920"
        table-class="withdrawal-table"
        empty-text="暂无提现工单"
      >
        <el-table-column
          label="申请用户"
          min-width="170"
        >
          <template #default="{ row }">
            <div class="withdrawal-user">
              <span class="withdrawal-user__avatar">
                <el-icon><Money /></el-icon>
              </span>
              <div>
                <strong>{{ row.nickname || row.username }}</strong>
                <small>{{ row.username }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="金额信息"
          min-width="170"
        >
          <template #default="{ row }">
            <div class="withdrawal-money">
              <span class="withdrawal-money__main">提现 ¥{{ row.amountYuan }}</span>
              <small>到账 ¥{{ row.arriveYuan }} / 费 ¥{{ row.feeYuan }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="收款信息"
          min-width="190"
        >
          <template #default="{ row }">
            <div class="withdrawal-payee">
              <strong>{{ row.account }}</strong>
              <small>{{ row.accountName }}</small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              round
              effect="light"
              :type="statusTagType[row.status as WithdrawalStatus]"
            >
              {{ WITHDRAWAL_STATUS_TEXT[row.status as WithdrawalStatus] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="申请时间"
          width="150"
        >
          <template #default="{ row }">
            <span class="withdrawal-muted">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="210"
          fixed="right"
        >
          <template #default="{ row }">
            <div class="withdrawal-row-actions">
              <el-button
                link
                type="primary"
                :icon="View"
                @click="openDetail(row)"
              >
                详情
              </el-button>
              <template v-if="row.status === WithdrawalStatus.Pending">
                <el-button
                  v-permission="PERMS.finance.withdrawalReview"
                  link
                  type="success"
                  :icon="Check"
                  @click="approve(row)"
                >
                  通过
                </el-button>
                <el-button
                  v-permission="PERMS.finance.withdrawalReview"
                  link
                  type="danger"
                  :icon="Close"
                  @click="reject(row)"
                >
                  驳回
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </app-data-table>

      <div class="admin-pager">
        <span class="withdrawal-muted">共 {{ total }} 条工单</span>
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[...PAGE_SIZE_OPTIONS]"
          @size-change="changePageSize"
          @current-change="changePage"
        />
      </div>
    </app-panel>

    <el-drawer
      v-model="detailVisible"
      title="提现工单详情"
      size="460px"
      class="admin-drawer withdrawal-detail-drawer"
    >
      <div
        v-if="currentWithdrawal"
        class="withdrawal-detail"
      >
        <div class="withdrawal-detail__summary">
          <span>到账金额</span>
          <strong>¥{{ currentWithdrawal.arriveYuan }}</strong>
          <el-tag
            round
            effect="light"
            :type="statusTagType[currentWithdrawal.status as WithdrawalStatus]"
          >
            {{ WITHDRAWAL_STATUS_TEXT[currentWithdrawal.status as WithdrawalStatus] }}
          </el-tag>
        </div>

        <el-descriptions
          :column="1"
          border
          class="withdrawal-detail__descriptions"
        >
          <el-descriptions-item label="申请用户">
            {{ currentWithdrawal.nickname || currentWithdrawal.username }}
            <span class="withdrawal-muted">（{{ currentWithdrawal.username }}）</span>
          </el-descriptions-item>
          <el-descriptions-item label="提现金额">
            ¥{{ currentWithdrawal.amountYuan }}
          </el-descriptions-item>
          <el-descriptions-item label="手续费">
            ¥{{ currentWithdrawal.feeYuan }}
          </el-descriptions-item>
          <el-descriptions-item label="到账金额">
            ¥{{ currentWithdrawal.arriveYuan }}
          </el-descriptions-item>
          <el-descriptions-item label="收款渠道">
            {{ payoutProviderText[currentWithdrawal.provider as PayoutProvider] }}
          </el-descriptions-item>
          <el-descriptions-item label="收款账号">
            {{ currentWithdrawal.account }}
          </el-descriptions-item>
          <el-descriptions-item label="收款姓名">
            {{ currentWithdrawal.accountName }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">
            {{ currentWithdrawal.idCardNo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道单号">
            {{ currentWithdrawal.providerOrderId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="失败/驳回原因">
            {{ currentWithdrawal.failReason || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="申请时间">
            {{ formatDate(currentWithdrawal.createdAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="admin-drawer__footer">
          <el-button @click="detailVisible = false">
            关闭
          </el-button>
          <template v-if="currentWithdrawal?.status === WithdrawalStatus.Pending">
            <el-button
              v-permission="PERMS.finance.withdrawalReview"
              type="success"
              :icon="Check"
              @click="approve(currentWithdrawal)"
            >
              通过
            </el-button>
            <el-button
              v-permission="PERMS.finance.withdrawalReview"
              type="danger"
              :icon="Close"
              @click="reject(currentWithdrawal)"
            >
              驳回
            </el-button>
          </template>
        </div>
      </template>
    </el-drawer>
  </section>
</template>
