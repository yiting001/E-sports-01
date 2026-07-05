<script setup lang="ts">
/**
 * 我的钱包页（全屏）：余额卡 + 充值/提现入口 + 分页流水明细。
 * 直连后端钱包模块既有接口；充值经扫码支付入账后自动刷新余额与流水。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  FundDirection,
  WalletTxnType,
  type WalletTransactionView,
  type WalletView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import RechargeDialog from '@/components/wallet/RechargeDialog.vue';
import WithdrawDialog from '@/components/wallet/WithdrawDialog.vue';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';
import './WalletView.responsive.css';

const PAGE_SIZE = 10;

/** 流水类型 → 展示文案 */
const TXN_TEXT: Record<WalletTxnType, string> = {
  [WalletTxnType.Recharge]: '充值',
  [WalletTxnType.Withdraw]: '提现',
  [WalletTxnType.Adjust]: '平台调整',
  [WalletTxnType.Commission]: '订单提成',
  [WalletTxnType.Deposit]: '缴纳押金',
  [WalletTxnType.DepositRefund]: '押金退还',
  [WalletTxnType.Penalty]: '罚款',
};

const router = useRouter();
const toast = useToast();

const wallet = ref<WalletView | null>(null);
const transactions = ref<WalletTransactionView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const recharging = ref(false);
const withdrawing = ref(false);

async function loadWallet(): Promise<void> {
  wallet.value = await walletApi.mine();
}

async function loadTransactions(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
    }
    const result = await walletApi.transactions(page.value, PAGE_SIZE);
    transactions.value = reset
      ? result.list
      : [...transactions.value, ...result.list];
    total.value = result.total;
  } finally {
    loading.value = false;
  }
}

function loadMore(): void {
  if (transactions.value.length >= total.value) {
    return;
  }
  page.value += 1;
  void loadTransactions();
}

/** 充值入账后：关弹层 → 刷新余额与流水 */
async function onRecharged(): Promise<void> {
  recharging.value = false;
  toast.show('充值成功，已入账');
  await Promise.all([loadWallet(), loadTransactions(true)]);
}

/** 提现提交后：关弹层 → 刷新余额与流水 */
async function onWithdrawn(): Promise<void> {
  withdrawing.value = false;
  await Promise.all([loadWallet(), loadTransactions(true)]);
}

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '';
}

onMounted(() => {
  void loadWallet();
  void loadTransactions(true);
});
</script>

<template>
  <div class="wallet-page">
    <header class="bar">
      <div class="bar-inner">
        <button
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">我的钱包</span>
      </div>
    </header>

    <div class="scroll">
      <section class="hero card">
        <span class="hero-label">当前余额（元）</span>
        <span class="hero-amount">{{ wallet?.balanceYuan ?? '0.00' }}</span>
        <div class="hero-actions">
          <button
            class="act act--primary"
            @click="recharging = true"
          >
            充值
          </button>
          <button
            class="act"
            @click="withdrawing = true"
          >
            提现
          </button>
        </div>
      </section>

      <section class="card txns">
        <h2 class="sec-title">
          流水明细
        </h2>
        <p
          v-if="!loading && transactions.length === 0"
          class="hint"
        >
          暂无流水记录
        </p>
        <div
          v-for="txn in transactions"
          :key="txn.id"
          class="txn"
        >
          <div class="txn-left">
            <p class="txn-type">
              {{ TXN_TEXT[txn.type] }}
              <span
                v-if="txn.remark"
                class="txn-remark"
              >· {{ txn.remark }}</span>
            </p>
            <p class="txn-time">
              {{ formatTime(txn.createdAt) }}
            </p>
          </div>
          <div class="txn-right">
            <span
              class="txn-amount"
              :class="{ 'txn-amount--in': txn.direction === FundDirection.In }"
            >
              {{ txn.direction === FundDirection.In ? '+' : '-' }}{{ txn.amountYuan }}
            </span>
            <span class="txn-balance">余额 {{ txn.balanceAfterYuan }}</span>
          </div>
        </div>
        <button
          v-if="transactions.length < total"
          class="more"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? '加载中…' : '加载更多' }}
        </button>
      </section>
    </div>

    <RechargeDialog
      v-if="recharging && wallet"
      @paid="onRecharged"
      @close="recharging = false"
    />
    <WithdrawDialog
      v-if="withdrawing && wallet"
      :balance-fen="wallet.balanceFen"
      :fee-rate-bp="wallet.withdrawFeeRateBp"
      @done="onWithdrawn"
      @close="withdrawing = false"
    />
  </div>
</template>

<style scoped>
.wallet-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero {
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero,
.txns {
  flex-shrink: 0;
}

.hero-label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.hero-amount {
  font-family: var(--font-num);
  font-size: 36px;
  font-weight: 800;
  color: var(--c-accent);
  text-shadow: 0 0 16px rgba(255, 176, 32, 0.35);
}

.hero-actions {
  margin-top: 8px;
  display: flex;
  gap: 10px;
}

.act {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.act--primary {
  color: var(--c-bg);
  background: var(--c-accent);
  border-color: var(--c-accent);
}

.txns {
  padding: 14px 16px;
}

.sec-title {
  font-size: 14px;
  font-weight: 800;
  font-style: italic;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 20px 0;
}

.txn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--c-border);
}

.txn:last-of-type {
  border-bottom: none;
}

.txn-type {
  font-size: 14px;
  font-weight: 700;
}

.txn-remark {
  font-size: 12px;
  font-weight: 400;
  color: var(--c-text-secondary);
}

.txn-time {
  margin-top: 4px;
  font-size: 11px;
  color: var(--c-text-muted);
}

.txn-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.txn-amount {
  font-family: var(--font-num);
  font-size: 15px;
  font-weight: 800;
}

.txn-amount--in {
  color: var(--c-neon);
}

.txn-balance {
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
