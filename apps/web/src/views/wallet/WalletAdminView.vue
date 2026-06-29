<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import {
  FundDirection,
  PAGINATION_DEFAULTS,
  PERMS,
  WalletStatus,
  WalletTxnType,
  type WalletAdminView,
  type WalletTransactionView,
} from '@app/contracts';
import { ElMessage } from 'element-plus';
import { Refresh, Search } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';
import { walletAdminApi } from '@/api/wallet.api';

/** 列表状态 */
const list = ref<WalletAdminView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(PAGINATION_DEFAULTS.pageSize);
const keyword = ref('');
const loading = ref(false);

const txnTypeText: Record<WalletTxnType, string> = {
  [WalletTxnType.Recharge]: '充值',
  [WalletTxnType.Withdraw]: '提现',
  [WalletTxnType.Adjust]: '调整',
};

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await walletAdminApi.listWallets({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value.trim() || undefined,
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

async function onSearch(): Promise<void> {
  page.value = 1;
  await load();
}

/** 明细弹窗状态 */
const txnVisible = ref(false);
const txnLoading = ref(false);
const txnList = ref<WalletTransactionView[]>([]);
const txnTotal = ref(0);
const txnPage = ref(1);
const txnPageSize = ref(PAGINATION_DEFAULTS.pageSize);
const currentUser = ref<WalletAdminView | null>(null);

async function loadTxns(): Promise<void> {
  if (!currentUser.value) {
    return;
  }
  txnLoading.value = true;
  try {
    const res = await walletAdminApi.userTransactions(currentUser.value.userId, {
      page: txnPage.value,
      pageSize: txnPageSize.value,
    });
    txnList.value = res.list;
    txnTotal.value = res.total;
  } finally {
    txnLoading.value = false;
  }
}

function openTxns(row: WalletAdminView): void {
  currentUser.value = row;
  txnPage.value = 1;
  txnVisible.value = true;
  void loadTxns();
}

async function changeTxnPage(value: number): Promise<void> {
  txnPage.value = value;
  await loadTxns();
}

/** 调整弹窗状态 */
const adjustVisible = ref(false);
const adjustSubmitting = ref(false);
const adjustForm = reactive({
  direction: FundDirection.In,
  amountYuan: 1,
  remark: '',
});

function openAdjust(row: WalletAdminView): void {
  currentUser.value = row;
  adjustForm.direction = FundDirection.In;
  adjustForm.amountYuan = 1;
  adjustForm.remark = '';
  adjustVisible.value = true;
}

async function submitAdjust(): Promise<void> {
  if (!currentUser.value) {
    return;
  }
  if (!adjustForm.remark.trim()) {
    ElMessage.warning('请填写调整备注');
    return;
  }
  adjustSubmitting.value = true;
  try {
    await walletAdminApi.adjust(currentUser.value.userId, {
      direction: adjustForm.direction,
      amountFen: Math.round(adjustForm.amountYuan * 100),
      remark: adjustForm.remark.trim(),
    });
    ElMessage.success('余额已调整');
    adjustVisible.value = false;
    await load();
  } finally {
    adjustSubmitting.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="wallet-admin">
    <header class="wallet-admin__head">
      <div>
        <h1>钱包管理</h1>
        <p>分页查看所有用户钱包与余额，查看任意用户收支明细，并可人工调整余额（充/扣，自动记流水）。</p>
      </div>
      <div class="wallet-admin__search">
        <el-input
          v-model="keyword"
          placeholder="按用户名/昵称搜索"
          clearable
          :prefix-icon="Search"
          @keyup.enter="onSearch"
          @clear="onSearch"
        />
        <el-button
          type="primary"
          :icon="Search"
          @click="onSearch"
        >
          搜索
        </el-button>
        <el-button
          :icon="Refresh"
          @click="load"
        >
          刷新
        </el-button>
      </div>
    </header>

    <app-data-table
      :data="list"
      :loading="loading"
      :min-width="900"
      empty-text="暂无用户钱包"
    >
      <el-table-column
        label="用户"
        min-width="200"
      >
        <template #default="{ row }">
          <div class="wallet-admin__user">
            <strong>{{ row.nickname || row.username }}</strong>
            <small>{{ row.username }}</small>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="余额（元）"
        width="150"
      >
        <template #default="{ row }">
          <span class="wallet-admin__balance">{{ row.balanceYuan }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="累计充值（元）"
        width="150"
        prop="totalRechargeYuan"
      />
      <el-table-column
        label="累计提现（元）"
        width="150"
        prop="totalWithdrawYuan"
      />
      <el-table-column
        label="状态"
        width="120"
      >
        <template #default="{ row }">
          <el-tag
            v-if="!row.initialized"
            type="info"
            effect="plain"
          >
            未开通
          </el-tag>
          <el-tag
            v-else-if="row.status === WalletStatus.Frozen"
            type="danger"
            effect="light"
          >
            冻结
          </el-tag>
          <el-tag
            v-else
            type="success"
            effect="light"
          >
            正常
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        label="操作"
        width="200"
        fixed="right"
      >
        <template #default="{ row }">
          <el-button
            v-permission="PERMS.wallet.transaction"
            link
            type="primary"
            @click="openTxns(row)"
          >
            明细
          </el-button>
          <el-button
            v-permission="PERMS.wallet.adjust"
            link
            type="warning"
            @click="openAdjust(row)"
          >
            调整余额
          </el-button>
        </template>
      </el-table-column>
    </app-data-table>

    <div class="wallet-admin__pager">
      <span>共 {{ total }} 位用户</span>
      <el-pagination
        layout="prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="changePage"
      />
    </div>

    <el-dialog
      v-model="txnVisible"
      :title="`收支明细 · ${currentUser?.nickname || currentUser?.username || ''}`"
      width="760px"
    >
      <app-data-table
        :data="txnList"
        :loading="txnLoading"
        :min-width="640"
        empty-text="暂无流水"
      >
        <el-table-column
          label="类型"
          width="110"
        >
          <template #default="{ row }">
            {{ txnTypeText[row.type as WalletTxnType] }}
          </template>
        </el-table-column>
        <el-table-column
          label="方向"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              round
              :type="row.direction === FundDirection.In ? 'success' : 'danger'"
              effect="light"
            >
              {{ row.direction === FundDirection.In ? '入账' : '出账' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="金额（元）"
          width="130"
        >
          <template #default="{ row }">
            {{ row.direction === FundDirection.In ? '+' : '-' }}{{ row.amountYuan }}
          </template>
        </el-table-column>
        <el-table-column
          label="变更后（元）"
          width="130"
          prop="balanceAfterYuan"
        />
        <el-table-column
          label="备注"
          prop="remark"
          min-width="150"
          show-overflow-tooltip
        />
        <el-table-column
          label="时间"
          width="180"
        >
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
      </app-data-table>
      <div class="wallet-admin__pager">
        <span>共 {{ txnTotal }} 条流水</span>
        <el-pagination
          layout="prev, pager, next"
          :total="txnTotal"
          :current-page="txnPage"
          :page-size="txnPageSize"
          @current-change="changeTxnPage"
        />
      </div>
    </el-dialog>

    <el-dialog
      v-model="adjustVisible"
      :title="`人工调整余额 · ${currentUser?.nickname || currentUser?.username || ''}`"
      width="460px"
    >
      <el-form
        label-width="92px"
        @submit.prevent
      >
        <el-form-item label="当前余额">
          <span class="wallet-admin__balance">{{ currentUser?.balanceYuan }} 元</span>
        </el-form-item>
        <el-form-item label="调整方向">
          <el-radio-group v-model="adjustForm.direction">
            <el-radio-button :value="FundDirection.In">
              增加（充）
            </el-radio-button>
            <el-radio-button :value="FundDirection.Out">
              扣减（扣）
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额（元）">
          <el-input-number
            v-model="adjustForm.amountYuan"
            :min="0.01"
            :step="1"
            :precision="2"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="adjustForm.remark"
            type="textarea"
            :rows="2"
            maxlength="255"
            show-word-limit
            placeholder="请填写调整原因，便于审计追溯"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="adjustVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="adjustSubmitting"
          @click="submitAdjust"
        >
          确认调整
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>

<style scoped>
.wallet-admin {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.wallet-admin__head {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.wallet-admin__head h1 {
  margin: 6px 0 4px;
  font-size: 22px;
}

.wallet-admin__head p {
  margin: 0;
  max-width: 560px;
  color: #64748b;
  font-size: 13px;
}

.wallet-admin__search {
  display: flex;
  gap: 8px;
  align-items: center;
}

.wallet-admin__search .el-input {
  width: 220px;
}

.wallet-admin__user {
  display: flex;
  flex-direction: column;
}

.wallet-admin__user small {
  color: #94a3b8;
}

.wallet-admin__balance {
  font-weight: 800;
  color: #1d4ed8;
}

.wallet-admin__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #64748b;
  font-size: 13px;
}
</style>
