<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import {
  ORDER_PAYMENT_METHOD_TEXT,
  OrderPaymentMethod,
  WalletStatus,
  fenToYuan,
  type WalletView,
} from '@app/contracts';
import RechargeDialog from '@/components/wallet/RechargeDialog.vue';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';
import { isWalletBalanceUnavailable } from '@/utils/checkout-state';

const props = defineProps<{
  /** 当前订单应付金额（分），用于实时判断余额是否足够 */
  amountFen: number;
}>();

const paymentMethod = defineModel<OrderPaymentMethod>({ required: true });
const toast = useToast();

const METHODS = [
  OrderPaymentMethod.Alipay,
  OrderPaymentMethod.Wechat,
  OrderPaymentMethod.Balance,
] as const;

const wallet = ref<WalletView | null>(null);
const walletLoading = ref(false);
const walletError = ref(false);
const walletReady = ref(false);
const rechargeOpen = ref(false);

const walletFrozen = computed(() => wallet.value?.status === WalletStatus.Frozen);
const balanceInsufficient = computed(
  () => wallet.value !== null && wallet.value.balanceFen < props.amountFen,
);
const balanceInvalid = computed(
  () => isWalletBalanceUnavailable(wallet.value, walletError.value, props.amountFen),
);
const balanceOptionDisabled = computed(
  () => walletLoading.value || balanceInvalid.value,
);
const deficitFen = computed(() =>
  wallet.value ? Math.max(props.amountFen - wallet.value.balanceFen, 0) : 0,
);

const walletMessage = computed(() => {
  if (walletLoading.value && !wallet.value) {
    return '余额加载中…';
  }
  if (walletError.value) {
    return '余额加载失败，请刷新后重试';
  }
  if (!wallet.value) {
    return '暂时无法获取钱包余额';
  }
  if (walletFrozen.value) {
    return `可用余额 ¥${wallet.value.balanceYuan}，钱包已冻结`;
  }
  if (balanceInsufficient.value) {
    return `可用余额 ¥${wallet.value.balanceYuan}，还差 ¥${fenToYuan(deficitFen.value)}`;
  }
  return `可用余额 ¥${wallet.value.balanceYuan}`;
});

function unavailableMessage(): string {
  if (walletFrozen.value) {
    return '钱包已冻结，已切换为支付宝支付';
  }
  if (balanceInsufficient.value) {
    return '余额不足，已切换为支付宝支付';
  }
  return '余额信息不可用，已切换为支付宝支付';
}

async function loadWallet(): Promise<boolean> {
  if (walletLoading.value) {
    return false;
  }
  walletLoading.value = true;
  walletReady.value = false;
  walletError.value = false;
  try {
    wallet.value = await walletApi.mine({ silent: true });
    return true;
  } catch {
    walletError.value = true;
    wallet.value = null;
    return false;
  } finally {
    walletLoading.value = false;
    walletReady.value = true;
  }
}

function selectMethod(method: OrderPaymentMethod): void {
  if (method === OrderPaymentMethod.Balance && balanceOptionDisabled.value) {
    return;
  }
  paymentMethod.value = method;
}

async function handleRechargePaid(): Promise<void> {
  rechargeOpen.value = false;
  if (await loadWallet()) {
    toast.show('充值成功，余额已刷新');
  }
}

watch(
  [() => paymentMethod.value, balanceInvalid, walletReady],
  ([method, invalid, ready]) => {
    if (ready && method === OrderPaymentMethod.Balance && invalid) {
      paymentMethod.value = OrderPaymentMethod.Alipay;
      toast.show(unavailableMessage());
    }
  },
  { immediate: true },
);

onMounted(() => void loadWallet());
</script>

<template>
  <div class="payment-methods">
    <div class="payment-heading">
      <span class="payment-label">支付方式</span>
      <button
        type="button"
        class="payment-refresh"
        :disabled="walletLoading"
        @click="loadWallet"
      >
        {{ walletLoading ? '刷新中…' : '刷新余额' }}
      </button>
    </div>

    <div class="payment-options">
      <button
        v-for="method in METHODS"
        :key="method"
        type="button"
        class="payment-option"
        :class="{ active: paymentMethod === method }"
        :disabled="method === OrderPaymentMethod.Balance && balanceOptionDisabled"
        :aria-pressed="paymentMethod === method"
        @click="selectMethod(method)"
      >
        {{ ORDER_PAYMENT_METHOD_TEXT[method] }}
      </button>
    </div>

    <div
      class="wallet-state"
      :class="{
        'wallet-state--error': walletError || walletFrozen,
        'wallet-state--warning': balanceInsufficient && !walletFrozen,
      }"
      aria-live="polite"
    >
      <span>{{ walletMessage }}</span>
      <button
        v-if="wallet && !walletFrozen"
        type="button"
        class="wallet-action"
        @click="rechargeOpen = true"
      >
        充值
      </button>
      <button
        v-else-if="walletError"
        type="button"
        class="wallet-action"
        :disabled="walletLoading"
        @click="loadWallet"
      >
        重试
      </button>
    </div>

    <RechargeDialog
      v-if="rechargeOpen"
      @paid="handleRechargePaid"
      @close="rechargeOpen = false"
    />
  </div>
</template>

<style scoped>
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.payment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.payment-label {
  font-size: 13px;
  font-weight: 700;
}

.payment-refresh,
.wallet-action {
  min-height: 32px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--c-accent);
}

.payment-refresh:disabled,
.wallet-action:disabled {
  opacity: 0.55;
}

.payment-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.payment-option {
  min-width: 0;
  min-height: 38px;
  padding: 7px 6px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.payment-option.active {
  color: var(--c-accent);
  border-color: var(--c-accent);
  background: var(--c-accent-dim);
  font-weight: 700;
}

.payment-option:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wallet-state {
  min-height: 34px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 7px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--c-text-secondary);
  background: var(--c-bg);
  border-left: 2px solid var(--c-border);
}

.wallet-state--warning {
  color: var(--c-accent);
  border-left-color: var(--c-accent);
}

.wallet-state--error {
  color: #ff8a8a;
  border-left-color: #ff5c5c;
}

.wallet-state > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.wallet-action {
  flex-shrink: 0;
}
</style>
