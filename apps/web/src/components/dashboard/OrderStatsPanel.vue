<script setup lang="ts">
import { ref, watch } from 'vue';
import type { OrderStatsView, StatsRange } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import EChart from './EChart.vue';
import {
  fenToYuanText,
  lineTrendOption,
  moneyTrendOption,
  pieOption,
  rankBarOption,
} from './chart-options';

/** 订单运营统计块：下单/GMV 趋势 + 状态分布 + 销量榜（需 dashboard:orders 权限） */
const props = defineProps<{ range: StatsRange }>();

const stats = ref<OrderStatsView>();
const loading = ref(false);

watch(
  () => props.range,
  async (range) => {
    loading.value = true;
    try {
      stats.value = await dashboardApi.orders(range);
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
    title="订单运营"
    eyebrow="Orders"
  >
    <template v-if="stats">
      <app-stats
        :items="[
          { label: '下单量', value: stats.totalOrders, helper: '区间内创建' },
          { label: '支付单量', value: stats.paidOrders, helper: `完成 ${stats.completedOrders} 单` },
          { label: 'GMV（元）', value: fenToYuanText(stats.gmvFen), helper: '支付成功实付' },
          { label: '折扣让利（元）', value: fenToYuanText(stats.discountFen), helper: '会员等级折扣' },
        ]"
      />
      <div class="chart-grid">
        <e-chart :option="lineTrendOption(stats.orderTrend, '下单量')" />
        <e-chart :option="moneyTrendOption(stats.gmvTrend, 'GMV')" />
        <e-chart :option="pieOption(stats.statusDistribution, '订单状态')" />
        <e-chart :option="rankBarOption(stats.topProducts, '销量')" />
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
