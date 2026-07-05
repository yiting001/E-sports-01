<script setup lang="ts">
/**
 * 我的页 · 打手等级/押金卡（仅打手身份展示）。
 * 展示当前等级、完成单数、提成比例与押金缴纳进度；
 * 押金未缴足时可从钱包余额一键缴纳（缴足后方可接单）。
 */
import { computed, onMounted, ref } from 'vue';
import {
  BoosterStatus,
  FEE_RATE_BASE,
  fenToYuan,
  type BoosterMineView,
} from '@app/contracts';
import { boosterApi } from '@/api/booster.api';
import { useToast } from '@/composables/use-toast';

const toast = useToast();

const mine = ref<BoosterMineView | null>(null);
const paying = ref(false);

const record = computed(() => mine.value?.record ?? null);
const approved = computed(() => mine.value?.status === BoosterStatus.Approved);
const requiredFen = computed(() => mine.value?.depositRequiredFen ?? 0);
const paidFen = computed(() => record.value?.depositFen ?? 0);
const depositSettled = computed(() => paidFen.value >= requiredFen.value);
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
  paying.value = true;
  try {
    await boosterApi.payDeposit();
    toast.show('押金已缴纳');
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
      <span>押金 ¥{{ fenToYuan(paidFen) }} / ¥{{ fenToYuan(requiredFen) }}</span>
    </div>
    <button
      v-if="!depositSettled"
      class="pay"
      :disabled="paying"
      @click="payDeposit"
    >
      {{ paying ? '缴纳中…' : '缴纳押金（缴足后可接单）' }}
    </button>
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
