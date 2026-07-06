<script setup lang="ts">
/**
 * 我的提现记录列表：展示每笔提现的金额/手续费/到账金额、审核状态与失败原因，
 * 分页加载；供钱包页「提现记录」页签复用。
 */
import { onMounted, ref } from 'vue';
import {
  WITHDRAWAL_STATUS_TEXT,
  WithdrawalStatus,
  type WithdrawalView,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';

const PAGE_SIZE = 10;

const records = ref<WithdrawalView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);

async function load(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
    }
    const result = await walletApi.myWithdrawals(page.value, PAGE_SIZE);
    records.value = reset ? result.list : [...records.value, ...result.list];
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function loadMore(): void {
  if (records.value.length >= total.value) {
    return;
  }
  page.value += 1;
  void load();
}

/** 状态 → 徽标样式修饰符 */
function statusClass(status: WithdrawalStatus): string {
  if (status === WithdrawalStatus.Success) {
    return 'wd-status--success';
  }
  if (
    status === WithdrawalStatus.Failed ||
    status === WithdrawalStatus.Rejected
  ) {
    return 'wd-status--fail';
  }
  return 'wd-status--pending';
}

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '';
}

defineExpose({ reload: () => load(true) });

onMounted(() => {
  void load(true);
});
</script>

<template>
  <div class="wd-list">
    <p
      v-if="!loading && records.length === 0"
      class="hint"
    >
      暂无提现记录
    </p>
    <div
      v-for="wd in records"
      :key="wd.id"
      class="wd"
    >
      <div class="wd-left">
        <p class="wd-amount">
          -{{ wd.amountYuan }}
          <span :class="['wd-status', statusClass(wd.status)]">
            {{ WITHDRAWAL_STATUS_TEXT[wd.status] }}
          </span>
        </p>
        <p class="wd-meta">
          手续费 {{ wd.feeYuan }} · 到账 {{ wd.arriveYuan }} · {{ wd.account }}
        </p>
        <p
          v-if="wd.failReason"
          class="wd-reason"
        >
          {{ wd.failReason }}
        </p>
        <p class="wd-time">
          {{ formatTime(wd.createdAt) }}
        </p>
      </div>
    </div>
    <button
      v-if="records.length < total"
      class="more"
      :disabled="loading"
      @click="loadMore"
    >
      {{ loading ? '加载中…' : '加载更多' }}
    </button>
  </div>
</template>

<style scoped>
.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 20px 0;
}

.wd {
  padding: 12px 0;
  border-bottom: 1px solid var(--c-border);
}

.wd:last-of-type {
  border-bottom: none;
}

.wd-amount {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: 800;
}

.wd-status {
  font-family: var(--font-base, inherit);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  color: var(--c-text-secondary);
}

.wd-status--success {
  color: var(--c-neon);
  border-color: currentcolor;
}

.wd-status--fail {
  color: var(--c-danger, #ff5a5a);
  border-color: currentcolor;
}

.wd-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.wd-reason {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-danger, #ff5a5a);
}

.wd-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--c-text-muted);
}

.more {
  display: block;
  margin: 12px auto 0;
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
