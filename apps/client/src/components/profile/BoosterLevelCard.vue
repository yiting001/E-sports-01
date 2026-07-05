<script setup lang="ts">
/**
 * 我的页 · 打手等级/押金卡（仅打手身份展示）。
 * 展示当前等级、完成单数、提成比例与押金缴纳进度；
 * 押金在配置的最低/最高交付额区间内自选金额缴纳（达最低额方可接单）。
 */
import { computed, onMounted, ref } from 'vue';
import {
  BoosterStatus,
  FEE_RATE_BASE,
  fenToYuan,
  yuanToFen,
  type BoosterMineView,
} from '@app/contracts';
import { boosterApi } from '@/api/booster.api';
import { useToast } from '@/composables/use-toast';

const toast = useToast();

const mine = ref<BoosterMineView | null>(null);
const paying = ref(false);
const amountYuan = ref('');

const record = computed(() => mine.value?.record ?? null);
const approved = computed(() => mine.value?.status === BoosterStatus.Approved);
const minFen = computed(() => mine.value?.depositPolicy.minFen ?? 0);
const maxFen = computed(() => mine.value?.depositPolicy.maxFen ?? 0);
const paidFen = computed(() => record.value?.depositFen ?? 0);
/** 已达最低交付额（接单门槛） */
const gateMet = computed(() => paidFen.value >= minFen.value);
/** 仍可继续缴纳（未达最高交付额） */
const canPayMore = computed(() => paidFen.value < maxFen.value);
const commissionPercent = computed(() =>
  (((record.value?.commissionRateBp ?? 0) / FEE_RATE_BASE) * 100).toFixed(1),
);

async function load(): Promise<void> {
  mine.value = await boosterApi.mine();
}

async function payDeposit(): Promise<void> {
  if (paying.value) {
    return;
  }
  const amountFen = yuanToFen(amountYuan.value);
  if (amountFen <= 0) {
    toast.show('请输入本次缴纳金额');
    return;
  }
  if (paidFen.value + amountFen > maxFen.value) {
    toast.show(`缴后累计不得超过 ¥${fenToYuan(maxFen.value)}`);
    return;
  }
  paying.value = true;
  try {
    await boosterApi.payDeposit(amountFen);
    toast.show('押金已缴纳');
    amountYuan.value = '';
    await load();
  } finally {
    paying.value = false;
  }
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section
    v-if="approved && record"
    class="card booster-card"
  >
    <div class="head">
      <span class="level">Lv.{{ record.level }} {{ record.levelName }}</span>
      <span class="rate">提成 {{ commissionPercent }}%</span>
    </div>
    <div class="meta">
      <span>累计完成 {{ record.completedOrders }} 单</span>
      <span>已缴押金 ¥{{ fenToYuan(paidFen) }}（最低 ¥{{ fenToYuan(minFen) }} / 最高 ¥{{ fenToYuan(maxFen) }}）</span>
    </div>
    <div
      v-if="canPayMore"
      class="deposit"
    >
      <input
        v-model="amountYuan"
        class="amount"
        type="number"
        inputmode="decimal"
        min="0"
        placeholder="本次缴纳金额（元）"
      >
      <button
        class="pay"
        :disabled="paying"
        @click="payDeposit"
      >
        {{ paying ? '缴纳中…' : gateMet ? '继续缴纳' : '缴纳押金（达最低额可接单）' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.booster-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.level {
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-accent);
}

.rate {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--c-text-muted);
}

.deposit {
  display: flex;
  gap: 8px;
}

.amount {
  flex: 1;
  min-width: 0;
  padding: 10px;
  font-size: 14px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
}

.pay {
  padding: 10px;
  font-size: 14px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.pay:disabled {
  opacity: 0.5;
}
</style>
