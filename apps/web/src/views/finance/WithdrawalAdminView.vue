<script setup lang="ts">
/**
 * 提现管理页（菜单 finance:withdrawal:menu，财务分组）。
 * 分页展示用户提现工单（可按状态过滤），展示金额/手续费/到账额、执行渠道与渠道侧快照（上游单号/状态/手续费）；
 * 支持审核通过（按执行渠道发起转账，异步渠道保持「转账中」）、驳回（填写理由，全额退回余额）
 * 与对「转账中」单据主动向渠道查单同步。动作逻辑见 use-withdrawal-review.ts。
 */
import { onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  PAYOUT_CHANNEL_STATE_TEXT,
  PAYOUT_PROVIDER_TEXT,
  PERMS,
  WITHDRAWAL_STATUS_TEXT,
  WithdrawalStatus,
  type PayoutChannelState,
  type PayoutProvider,
  type WithdrawalAdminView,
} from '@app/contracts';
import {
  Check,
  Close,
  Download,
  Money,
  Refresh,
  RefreshRight,
  Search,
  View,
} from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import AppPanel from '@/components/common/AppPanel.vue';
import { PAGE_SIZE_OPTIONS } from '@/config/pagination';
import { financeApi } from '@/api/finance.api';
import { useWithdrawalReview } from './use-withdrawal-review';
import './WithdrawalAdminView.css';

const list = ref<WithdrawalAdminView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<WithdrawalStatus | undefined>(undefined);
const loading = ref(false);
const detailVisible = ref(false);
const currentWithdrawal = ref<WithdrawalAdminView | null>(null);

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

function formatDate(value: string | null): string {
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

const { exporting, syncingId, approve, syncChannel, reject, exportTaxReport } =
  useWithdrawalReview({ reload: load, syncCurrent: syncCurrentWithdrawal });

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
              <small>{{ row.accountName }}<template v-if="row.bankName"> · {{ row.bankName }}</template></small>
            </div>
          </template>
        </el-table-column>
        <el-table-column
          label="渠道"
          min-width="150"
        >
          <template #default="{ row }">
            <div class="withdrawal-payee">
              <strong>{{ PAYOUT_PROVIDER_TEXT[row.provider as PayoutProvider] }}</strong>
              <small v-if="row.channelState">
                {{ PAYOUT_CHANNEL_STATE_TEXT[row.channelState as PayoutChannelState] }}
              </small>
              <small v-if="Number(row.channelFeeFen) > 0">渠道费 ¥{{ row.channelFeeYuan }}</small>
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
              <el-button
                v-if="row.status === WithdrawalStatus.Processing"
                v-permission="PERMS.finance.withdrawalReview"
                link
                type="primary"
                :icon="RefreshRight"
                :loading="syncingId === row.id"
                @click="syncChannel(row)"
              >
                同步
              </el-button>
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
          <el-descriptions-item label="执行渠道">
            {{ PAYOUT_PROVIDER_TEXT[currentWithdrawal.provider] }}
          </el-descriptions-item>
          <el-descriptions-item label="收款账号">
            {{ currentWithdrawal.account }}
          </el-descriptions-item>
          <el-descriptions-item label="收款姓名">
            {{ currentWithdrawal.accountName }}
          </el-descriptions-item>
          <el-descriptions-item label="开户行">
            {{ currentWithdrawal.bankName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="预留手机号">
            {{ currentWithdrawal.phone || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">
            {{ currentWithdrawal.idCardNo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道单号">
            {{ currentWithdrawal.providerOrderId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="上游转账单号">
            {{ currentWithdrawal.channelOrderNo || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道状态">
            {{
              currentWithdrawal.channelState
                ? PAYOUT_CHANNEL_STATE_TEXT[currentWithdrawal.channelState]
                : '-'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道手续费">
            ¥{{ currentWithdrawal.channelFeeYuan }}
          </el-descriptions-item>
          <el-descriptions-item label="渠道错误">
            {{ currentWithdrawal.channelErrMsg || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="最近同步">
            {{ formatDate(currentWithdrawal.channelSyncedAt) }}
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
          <el-button
            v-if="currentWithdrawal?.status === WithdrawalStatus.Processing"
            v-permission="PERMS.finance.withdrawalReview"
            type="primary"
            :icon="RefreshRight"
            :loading="syncingId === currentWithdrawal.id"
            @click="syncChannel(currentWithdrawal)"
          >
            同步渠道状态
          </el-button>
        </div>
      </template>
    </el-drawer>
  </section>
</template>
