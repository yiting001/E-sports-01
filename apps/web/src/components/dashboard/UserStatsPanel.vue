<script setup lang="ts">
import { ref, watch } from 'vue';
import type { StatsRange, UserStatsView } from '@app/contracts';
import { dashboardApi } from '@/api/dashboard.api';
import AppPanel from '@/components/common/AppPanel.vue';
import AppStats from '@/components/common/AppStats.vue';
import EChart from './EChart.vue';
import { lineTrendOption, pieOption } from './chart-options';

/** 用户增长统计块：注册趋势 + 会员等级分布（需 dashboard:users 权限） */
const props = defineProps<{ range: StatsRange }>();

const stats = ref<UserStatsView>();
const loading = ref(false);

watch(
  () => props.range,
  async (range) => {
    loading.value = true;
    try {
      stats.value = await dashboardApi.users(range);
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
    title="用户增长"
    eyebrow="Users"
  >
    <template v-if="stats">
      <app-stats
        :items="[
          { label: '累计用户', value: stats.totalUsers, helper: '全平台' },
          { label: '新增用户', value: stats.newUsers, helper: '区间内注册' },
        ]"
      />
      <div class="chart-grid">
        <e-chart :option="lineTrendOption(stats.userTrend, '注册数')" />
        <e-chart :option="pieOption(stats.memberLevelDistribution, '会员等级')" />
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
