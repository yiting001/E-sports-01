<script setup lang="ts">
/**
 * 打手「我的资金」面板：押金/可用余额/冻结金额 + 累计/本月/上月结算 + 已交罚款。
 * 视觉沿用接单大厅订单卡的电竞风：紫色渐变横幅 + 闪电徽章展示可用余额，
 * 网格项带彩色图标徽章分组配色（资金金色/结算粉色）。
 * 数据来自 GET /booster/funds/mine 只读聚合；加载失败展示重试，不阻断个人中心其他区块。
 */
import { fenToYuan, type BoosterFundsView } from '@app/contracts';
import { computed, onMounted, ref } from 'vue';
import { boosterApi } from '@/api/booster.api';
import AppIcon from '@/components/common/AppIcon.vue';
import type { IconName } from '@/config/icon-paths';

const funds = ref<BoosterFundsView | null>(null);
const loading = ref(true);
const loadError = ref(false);

const balance = computed(() => (funds.value ? fenToYuan(funds.value.balanceFen) : ''));

interface FundsItem {
  label: string;
  value: string;
  icon: IconName;
  tone: 'gold' | 'pink';
}

const items = computed<FundsItem[]>(() => {
  const view = funds.value;
  if (!view) {
    return [];
  }
  return [
    { label: '保证金', value: fenToYuan(view.depositFen), icon: 'card', tone: 'gold' },
    { label: '冻结金额', value: fenToYuan(view.frozenFen), icon: 'box', tone: 'gold' },
    { label: '已交罚款', value: fenToYuan(view.penaltyPaidFen), icon: 'chat', tone: 'gold' },
    { label: '累计结算', value: fenToYuan(view.totalCommissionFen), icon: 'bolt', tone: 'pink' },
    { label: '本月结算', value: fenToYuan(view.monthCommissionFen), icon: 'bolt', tone: 'pink' },
    { label: '上月结算', value: fenToYuan(view.lastMonthCommissionFen), icon: 'bolt', tone: 'pink' },
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
        <span class="hero-bolt">
          <AppIcon
            name="bolt"
            :size="16"
          />
        </span>
        <span class="hero-label">可用余额（元）</span>
        <span class="hero-value">{{ balance }}</span>
      </div>
      <div class="grid">
        <div
          v-for="item in items"
          :key="item.label"
          class="item"
          :class="`item--${item.tone}`"
        >
          <span class="item-icon">
            <AppIcon
              :name="item.icon"
              :size="13"
            />
          </span>
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
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  padding: 18px 14px;
  border-radius: 12px;
  background: linear-gradient(100deg, #2c2a72, #4a2f8f 55%, #7a2c6f);
  border: 1px solid color-mix(in srgb, #7a5cff 40%, transparent);
}

.hero-bolt {
  position: absolute;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: #ffd257;
  background: rgba(255, 255, 255, 0.12);
}

.hero-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 1px;
}

.hero-value {
  font-family: var(--font-num);
  font-size: 32px;
  font-weight: 800;
  line-height: 1.1;
  color: #ffd257;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 2px 10px rgba(255, 210, 87, 0.35);
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
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-cover-bg) 60%, transparent);
  border: 1px solid transparent;
}

.item--gold {
  border-color: color-mix(in srgb, var(--c-accent) 30%, transparent);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--c-accent) 14%, transparent),
    color-mix(in srgb, var(--c-accent) 4%, transparent)
  );
}

.item--pink {
  border-color: color-mix(in srgb, #f5317f 35%, transparent);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, #f5317f 14%, transparent),
    color-mix(in srgb, #ff7a3c 5%, transparent)
  );
}

.item-icon {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
}

.item--gold .item-icon {
  color: var(--c-accent);
}

.item--pink .item-icon {
  color: #f5317f;
}

.value {
  font-family: var(--font-num);
  font-size: 17px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.item--gold .value {
  color: var(--c-accent);
}

.item--pink .value {
  color: #ff7a9d;
}

.label {
  font-size: 12px;
  color: var(--c-text-muted);
}
</style>
