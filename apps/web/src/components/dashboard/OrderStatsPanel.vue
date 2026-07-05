<script setup lang="ts">
import { ref, watch } from 'vue';
import type { OrderStatsView, StatsRange } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
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
  <section
    v-loading="loading"
    class="dashboard-stat-panel"
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
      <div class="dashboard-chart-grid dashboard-chart-grid--quad">
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">下单趋势</div>
          <e-chart
            :option="lineTrendOption(stats.orderTrend, '下单量')"
            height="180px"
          />
        </div>
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">GMV 趋势</div>
          <e-chart
            :option="moneyTrendOption(stats.gmvTrend, 'GMV')"
            height="180px"
          />
        </div>
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">订单状态</div>
          <e-chart
            :option="pieOption(stats.statusDistribution, '订单状态')"
            height="180px"
          />
        </div>
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">商品销量 Top</div>
          <e-chart
            :option="rankBarOption(stats.topProducts, '销量')"
            height="180px"
          />
        </div>
      </div>
    </template>
  </section>
</template>
