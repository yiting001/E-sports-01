<script setup lang="ts">
import { ref, watch } from 'vue';
import type { BoosterStatsView, StatsRange } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import EChart from './EChart.vue';
import { lineTrendOption, pieOption } from './chart-options';

/** 打手生态统计块：入驻申请趋势 + 等级分布（需 dashboard:boosters 权限） */
const props = defineProps<{ range: StatsRange }>();

const stats = ref<BoosterStatsView>();
const loading = ref(false);

watch(
  () => props.range,
  async (range) => {
    loading.value = true;
    try {
      stats.value = await dashboardApi.boosters(range);
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
    title="打手生态"
    eyebrow="Boosters"
  >
    <template v-if="stats">
      <app-stats
        :items="[
          { label: '已入驻打手', value: stats.totalBoosters, helper: '累计' },
          { label: '待审核申请', value: stats.pendingBoosters, helper: '当前' },
          { label: '新增申请', value: stats.newApplications, helper: '区间内提交' },
        ]"
      />
      <div class="chart-grid">
        <e-chart :option="lineTrendOption(stats.applicationTrend, '申请数')" />
        <e-chart :option="pieOption(stats.levelDistribution, '打手等级')" />
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
