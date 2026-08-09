<script setup lang="ts">
/**
 * 打手「我的资金」面板：押金/可用余额/冻结金额 + 累计/本月/上月结算 + 已交罚款。
 * 数据来自 GET /booster/funds/mine 只读聚合；加载失败展示重试，不阻断个人中心其他区块。
 */
import { fenToYuan, type BoosterFundsView } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { boosterApi } from '@/api/booster.api';

const funds = ref<BoosterFundsView | null>(null);
const loading = ref(true);
const loadError = ref(false);

const items = computed(() => {
  const view = funds.value;
  if (!view) {
    return [];
  }
  return [
    { label: '保证金', value: fenToYuan(view.depositFen) },
    { label: '可用余额', value: fenToYuan(view.balanceFen) },
    { label: '冻结金额', value: fenToYuan(view.frozenFen) },
    { label: '累计结算', value: fenToYuan(view.totalCommissionFen) },
    { label: '本月结算', value: fenToYuan(view.monthCommissionFen) },
    { label: '上月结算', value: fenToYuan(view.lastMonthCommissionFen) },
    { label: '已交罚款', value: fenToYuan(view.penaltyPaidFen) },
  ];
});

async function load(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    funds.value = await boosterApi.fundsMine();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <section class="funds card">
    <h2 class="title">
      我的资金
    </h2>
    <p
      v-if="loading"
      class="state"
    >
      加载中…
    </p>
    <template v-else-if="loadError">
      <p class="state">
        资金信息加载失败
      </p>
      <button
        type="button"
        class="retry"
        @click="load"
      >
        重新加载
      </button>
    </template>
    <div
      v-else
      class="grid"
    >
      <div
        v-for="item in items"
        :key="item.label"
        class="item"
      >
        <span class="value">{{ item.value }}</span>
        <span class="label">{{ item.label }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.funds {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
}

.title {
  font-size: 15px;
  font-weight: 800;
}

.state {
  font-size: 13px;
  color: var(--c-text-muted);
}

.retry {
  align-self: flex-start;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px 8px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.value {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
}

.label {
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
