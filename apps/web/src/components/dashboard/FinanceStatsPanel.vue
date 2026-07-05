<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { FinanceStatsView, StatsRange } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import EChart from './EChart.vue';
import { fenToYuanText, flowTrendOption, pieOption } from './chart-options';

/** 财务资金统计块：各流水类型金额 + 收支趋势（需 dashboard:finance 权限） */
const props = defineProps<{ range: StatsRange }>();

const stats = ref<FinanceStatsView>();
const loading = ref(false);

/** 饼图按元展示：把分布 count（分）换算为元数值 */
const typeDistributionYuan = computed(() =>
  (stats.value?.typeDistribution ?? []).map((row) => ({
    name: row.name,
    count: Number(fenToYuanText(row.count)),
  })),
);

watch(
  () => props.range,
  async (range) => {
    loading.value = true;
    try {
      stats.value = await dashboardApi.finance(range);
    } finally {
      loading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <app-panel
    v-loading="loading"
    title="财务资金"
    eyebrow="Finance"
  >
    <template v-if="stats">
      <app-stats
        :items="[
          { label: '充值（元）', value: fenToYuanText(stats.rechargeFen), helper: '用户入账' },
          { label: '提现（元）', value: fenToYuanText(stats.withdrawFen), helper: '用户出账' },
          {
            label: '提成支出（元）',
            value: fenToYuanText(stats.commissionFen),
            helper: `罚款收回 ${fenToYuanText(stats.penaltyFen)} 元`,
          },
          {
            label: '押金缴纳（元）',
            value: fenToYuanText(stats.depositFen),
            helper: `退还 ${fenToYuanText(stats.depositRefundFen)} 元`,
          },
        ]"
      />
      <div class="chart-grid">
        <e-chart :option="flowTrendOption(stats.flowTrend)" />
        <e-chart :option="pieOption(typeDistributionYuan, '流水金额（元）')" />
      </div>
    </template>
  </app-panel>
</template>

<style scoped>
.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 12px;
}
</style>
