<script setup lang="ts">
import { ref, watch } from 'vue';
import type { BoosterStatsView, StatsRange } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
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
  <section
    v-loading="loading"
    class="dashboard-stat-panel"
  >
    <template v-if="stats">
      <app-stats
        :items="[
          { label: '已入驻打手', value: stats.totalBoosters, helper: '累计' },
          { label: '待审核申请', value: stats.pendingBoosters, helper: '当前' },
          { label: '新增申请', value: stats.newApplications, helper: '区间内提交' },
        ]"
      />
      <div class="dashboard-chart-grid">
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">申请趋势</div>
          <e-chart
            :option="lineTrendOption(stats.applicationTrend, '申请数')"
            height="240px"
          />
        </div>
        <div class="dashboard-chart-card">
          <div class="dashboard-chart-card__title">打手等级分布</div>
          <e-chart
            :option="pieOption(stats.levelDistribution, '打手等级')"
            height="240px"
          />
        </div>
      </div>
    </template>
  </section>
</template>
