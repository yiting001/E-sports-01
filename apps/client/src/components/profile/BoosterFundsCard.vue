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

const balance = computed(() => (funds.value ? fenToYuan(funds.value.balanceFen) : ''));

const items = computed(() => {
  const view = funds.value;
  if (!view) {
    return [];
  }
  return [
    { label: '保证金', value: fenToYuan(view.depositFen) },
    { label: '冻结金额', value: fenToYuan(view.frozenFen) },
    { label: '已交罚款', value: fenToYuan(view.penaltyPaidFen) },
    { label: '累计结算', value: fenToYuan(view.totalCommissionFen) },
    { label: '本月结算', value: fenToYuan(view.monthCommissionFen) },
    { label: '上月结算', value: fenToYuan(view.lastMonthCommissionFen) },
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
    <template v-else>
      <div class="hero">
        <span class="hero-label">可用余额（元）</span>
        <span class="hero-value">{{ balance }}</span>
      </div>
      <div class="grid">
        <div
          v-for="item in items"
          :key="item.label"
          class="item"
        >
          <span class="value">{{ item.value }}</span>
          <span class="label">{{ item.label }}</span>
        </div>
      </div>
    </template>
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

.hero {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 16px 12px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--c-accent) 14%, transparent),
    color-mix(in srgb, var(--c-accent) 4%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--c-accent) 25%, transparent);
  border-radius: 12px;
}

.hero-label {
  font-size: 12px;
  color: var(--c-text-muted);
  letter-spacing: 1px;
}

.hero-value {
  font-family: var(--font-num);
  font-size: 30px;
  font-weight: 800;
  line-height: 1.1;
  color: var(--c-accent);
  font-variant-numeric: tabular-nums;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px 8px;
}

.item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  padding: 12px 4px;
  text-align: center;
  background: color-mix(in srgb, var(--c-text) 4%, transparent);
  border-radius: 10px;
}

.value {
  font-family: var(--font-num);
  font-size: 17px;
  font-weight: 800;
  color: var(--c-accent);
  font-variant-numeric: tabular-nums;
}

.label {
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
