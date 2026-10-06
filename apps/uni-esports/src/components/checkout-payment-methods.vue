<template>
  <view class="payment-methods">
    <view class="payment-heading">
      <text class="payment-label">
        支付方式
      </text>
      <button
        class="payment-refresh"
        :disabled="walletLoading"
        @tap="loadWallet"
      >
        {{ walletLoading ? '刷新中…' : '刷新余额' }}
      </button>
    </view>

    <view class="payment-options">
      <button
        v-for="method in methods"
        :key="method"
        class="payment-option"
        :class="{ active: modelValue === method }"
        :disabled="method === OrderPaymentMethod.Balance && balanceOptionDisabled"
        @tap="selectMethod(method)"
      >
        {{ ORDER_PAYMENT_METHOD_TEXT[method] }}
      </button>
    </view>

    <view
      class="wallet-state"
      :class="{
        'wallet-state-error': walletError || walletFrozen,
        'wallet-state-warning': balanceInsufficient && !walletFrozen,
      }"
    >
      <text class="wallet-message">
        {{ walletMessage }}
      </text>
      <button
        v-if="wallet && !walletFrozen"
        class="wallet-action"
        @tap="gotoRecharge"
      >
        充值
      </button>
      <button
        v-else-if="walletError"
        class="wallet-action"
        :disabled="walletLoading"
        @tap="loadWallet"
      >
        重试
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { WalletView } from '@app/contracts';
import {
  ORDER_PAYMENT_METHOD_TEXT,
  OrderPaymentMethod,
  WalletStatus,
  fenToYuan,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';

/**
 * 结算页支付方式（与 apps/client 的 CheckoutPaymentMethods 同构）：
 * 三段选择 + 余额状态条。小程序内不引导外部扫码支付：
 * 支付宝/微信在服务端返回拉起参数前提交仍会以合规提示保留待付款订单。
 */
const props = defineProps<{
  /** 当前订单应付金额（分），用于实时判断余额是否足够 */
  amountFen: number;
}>();

const modelValue = defineModel<OrderPaymentMethod>({ required: true });

const methods = [
  OrderPaymentMethod.Alipay,
  OrderPaymentMethod.Wechat,
  OrderPaymentMethod.Balance,
] as const;

const wallet = ref<WalletView | null>(null);
const walletLoading = ref(false);
const walletError = ref(false);

const walletFrozen = computed(() => wallet.value?.status === WalletStatus.Frozen);
const balanceInsufficient = computed(
  () => wallet.value !== null && wallet.value.balanceFen < props.amountFen,
);
const balanceOptionDisabled = computed(
  () => walletLoading.value || walletError.value || wallet.value === null,
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

async function loadWallet(): Promise<void> {
  if (walletLoading.value) {
    return;
  }
  walletLoading.value = true;
  walletError.value = false;
  try {
    wallet.value = await walletApi.mine();
  } catch {
    walletError.value = true;
    wallet.value = null;
  } finally {
    walletLoading.value = false;
  }
}

function selectMethod(method: OrderPaymentMethod): void {
  if (method === OrderPaymentMethod.Balance && balanceOptionDisabled.value) {
    return;
  }
  modelValue.value = method;
}

function gotoRecharge(): void {
  uni.navigateTo({ url: '/pages/wallet/wallet' });
}

onMounted(() => {
  void loadWallet();
});
</script>

<style scoped>
.payment-methods {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.payment-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.payment-label {
  color: #e9eef6;
  font-size: 26rpx;
  font-weight: 600;
}

.payment-refresh,
.wallet-action {
  height: 56rpx;
  padding: 0 16rpx;
  display: flex;
  align-items: center;
  color: #ffb020;
  font-size: 24rpx;
}

.payment-refresh:disabled {
  opacity: 0.55;
}

.payment-options {
  display: flex;
  gap: 16rpx;
}

.payment-option {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #9aa6bb;
  background-color: #1a2130;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.payment-option.active {
  color: #ffb020;
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.1);
  font-weight: 600;
}

.payment-option:disabled {
  opacity: 0.45;
}

.wallet-state {
  min-height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 12rpx 20rpx;
  background-color: #0b0e14;
  border-left: 4rpx solid rgba(150, 165, 195, 0.24);
}

.wallet-state-warning {
  border-left-color: #ffb020;
}

.wallet-state-error {
  border-left-color: #ff5449;
}

.wallet-message {
  flex: 1;
  color: #9aa6bb;
  font-size: 24rpx;
  line-height: 1.5;
}

.wallet-state-warning .wallet-message {
  color: #ffb020;
}

.wallet-state-error .wallet-message {
  color: #ff8a8a;
}

.wallet-action {
  flex-shrink: 0;
}
</style>
