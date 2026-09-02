<script setup lang="ts">
/**
 * 我的页 · 打手等级/押金卡（仅打手身份展示）。
 * 展示当前等级、完成单数与押金缴纳进度；
 * 押金在配置的最低/最高交付额区间内自选金额缴纳（达最低额方可接单）；
 * 后台开启实名要求且未通过时展示实名认证入口（未实名不可接单）。
 * 押金缴纳成功后抛出 deposit-paid，由父级刷新资金/余额卡。
 */
import { computed, onMounted, ref } from 'vue';
import {
  BoosterStatus,
  fenToYuan,
  yuanToFen,
  type BoosterMineView,
} from '@app/contracts';
import { boosterApi } from '@/api/booster.api';
import { useToast } from '@/composables/use-toast';

const emit = defineEmits<{ (e: 'deposit-paid'): void }>();
const toast = useToast();

const mine = ref<BoosterMineView | null>(null);
const paying = ref(false);
const amountYuan = ref('');

const record = computed(() => mine.value?.record ?? null);
/** 后台要求实名且尚未通过，需引导去实名认证 */
const realnameBlocked = computed(
  () => (mine.value?.requireRealname ?? false) && !(mine.value?.realnameApproved ?? false),
);
const approved = computed(() => mine.value?.status === BoosterStatus.Approved);
const minFen = computed(() => mine.value?.depositPolicy.minFen ?? 0);
const maxFen = computed(() => mine.value?.depositPolicy.maxFen ?? 0);
const paidFen = computed(() => record.value?.depositFen ?? 0);
/** 已达最低交付额（接单门槛） */
const gateMet = computed(() => paidFen.value >= minFen.value);
/** 仍可继续缴纳（未达最高交付额） */
const canPayMore = computed(() => paidFen.value < maxFen.value);

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
    emit('deposit-paid');
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
    </div>
    <div class="meta">
      <span>累计完成 {{ record.completedOrders }} 单</span>
      <span>已缴押金 ¥{{ fenToYuan(paidFen) }}（最低 ¥{{ fenToYuan(minFen) }} / 最高 ¥{{ fenToYuan(maxFen) }}）</span>
    </div>
    <RouterLink
      v-if="realnameBlocked"
      class="realname"
      :to="{ name: 'realname' }"
    >
      平台要求打手实名认证，未实名不可接单，去完成 ›
    </RouterLink>
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

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--c-text-muted);
}

.realname {
  font-size: 13px;
  color: var(--c-danger);
  padding: 8px 10px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
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
