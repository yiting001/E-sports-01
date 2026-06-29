<script setup lang="ts">
import type { WalletTransactionView } from '@app/contracts';
import { FundDirection, WalletTxnType } from '@app/contracts';
import { Download, Refresh, Upload } from '@element-plus/icons-vue';
import AppDataTable from '@/components/common/AppDataTable.vue';

defineProps<{
  transactions: WalletTransactionView[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  recharge: [];
  'update:page': [value: number];
}>();

const txnTypeText: Record<WalletTxnType, string> = {
  [WalletTxnType.Recharge]: '充值',
  [WalletTxnType.Withdraw]: '提现',
  [WalletTxnType.Adjust]: '调整',
};
</script>

<template>
  <section class="wallet-panel">
    <div class="wallet-panel__head">
      <div>
        <span class="wallet-eyebrow">Transaction Ledger</span>
        <h2>收支明细</h2>
      </div>
      <div class="wallet-panel__actions">
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
        <el-button
          type="primary"
          :icon="Upload"
          @click="emit('recharge')"
        >
          充值
        </el-button>
      </div>
    </div>

    <app-data-table
      :data="transactions"
      :loading="loading"
      :min-width="900"
      table-class="wallet-table"
      empty-text="暂无流水"
    >
      <el-table-column
        label="流水类型"
        min-width="170"
      >
        <template #default="{ row }">
          <div class="wallet-type">
            <span
              class="wallet-type__icon"
              :class="row.direction === FundDirection.In ? 'is-in' : 'is-out'"
            >
              <el-icon>
                <Upload v-if="row.direction === FundDirection.In" />
                <Download v-else />
              </el-icon>
            </span>
            <div>
              <strong>{{ txnTypeText[row.type as WalletTxnType] }}</strong>
              <small>{{ row.bizOrderId ?? '系统流水' }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        label="资金方向"
        width="120"
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
        width="150"
      >
        <template #default="{ row }">
          <span :class="row.direction === FundDirection.In ? 'amount-in' : 'amount-out'">
            {{ row.direction === FundDirection.In ? '+' : '-' }}{{ row.amountYuan }}
          </span>
        </template>
      </el-table-column>
      <el-table-column
        label="变更后余额（元）"
        width="170"
      >
        <template #default="{ row }">
          <span class="wallet-balance-after">{{ row.balanceAfterYuan }}</span>
        </template>
      </el-table-column>
      <el-table-column
        label="备注"
        prop="remark"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column
        label="时间"
        width="190"
      >
        <template #default="{ row }">
          <span class="wallet-date">{{ new Date(row.createdAt).toLocaleString() }}</span>
        </template>
      </el-table-column>
    </app-data-table>

    <div class="wallet-pager">
      <span class="wallet-pager__summary">共 {{ total }} 条流水</span>
      <el-pagination
        class="wallet-pagination"
        layout="prev, pager, next"
        :total="total"
        :current-page="page"
        :page-size="pageSize"
        @current-change="(value: number) => emit('update:page', value)"
      />
    </div>
  </section>
</template>
