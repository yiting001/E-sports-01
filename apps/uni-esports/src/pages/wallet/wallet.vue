<template>
  <view class="wallet">
    <view class="card balance-card">
      <text class="balance-label">
        钱包余额（元）
      </text>
      <text class="balance-value">
        {{ wallet?.balanceYuan ?? '--' }}
      </text>
      <view class="balance-actions">
        <button
          class="btn-primary balance-recharge"
          @tap="openRecharge"
        >
          充值
        </button>
      </view>
    </view>

    <view class="card section">
      <text class="section-title">
        余额流水
      </text>
      <view
        v-for="txn in transactions"
        :key="txn.id"
        class="txn-item"
      >
        <view class="txn-info">
          <text class="txn-type">
            {{ txnTypeText(txn.type) }}
          </text>
          <text class="txn-time">
            {{ formatDateTime(txn.createdAt) }}
          </text>
        </view>
        <view class="txn-amount">
          <text
            class="txn-value"
            :class="{ 'txn-in': txn.direction === 'in' }"
          >
            {{ txn.direction === 'in' ? '+' : '-' }}¥{{ txn.amountYuan }}
          </text>
          <text class="txn-balance">
            余额 ¥{{ txn.balanceAfterYuan }}
          </text>
        </view>
      </view>
      <empty-state
        v-if="!loading && transactions.length === 0"
        text="暂无流水记录"
      />
      <view
        v-if="loadingMore"
        class="loading-more"
      >
        <text class="text-muted">
          加载中…
        </text>
      </view>
    </view>

    <view
      v-if="showRecharge"
      class="recharge-mask"
      @tap="showRecharge = false"
    >
      <view
        class="card recharge-panel"
        @tap.stop
      >
        <text class="section-title">
          选择充值金额
        </text>
        <view class="amount-grid">
          <view
            v-for="preset in presets"
            :key="preset"
            class="amount-item"
            :class="{ active: preset === amountFen }"
            @tap="amountFen = preset"
          >
            <text
              class="amount-text"
              :class="{ 'amount-text-active': preset === amountFen }"
            >
              {{ fenToYuan(preset) }} 元
            </text>
          </view>
        </view>
        <button
          class="btn-primary recharge-submit"
          :class="{ disabled: submitting }"
          @tap="submitRecharge"
        >
          {{ submitting ? '拉起支付中…' : '微信支付充值' }}
        </button>
        <text class="recharge-tip">
          小程序内暂仅支持微信支付充值（需服务商开通小程序支付）
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onReachBottom, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { WalletTransactionView, WalletView } from '@app/contracts';
import {
  PaymentProvider,
  RechargeStatus,
  WalletTxnType,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';
import emptyState from '@/components/empty-state.vue';
import { useRequireLogin } from '@/composables/use-require-login';
import { fenToYuan, formatDateTime } from '@/utils/format';
import { toast } from '@/utils/toast';

const PAGE_SIZE = 20;
/** 充值金额预设（分） */
const PRESETS_FEN = [2000, 5000, 10000, 20000, 50000, 100000] as const;

const { ensureLoggedIn } = useRequireLogin(true);

const wallet = ref<WalletView | null>(null);
const transactions = ref<WalletTransactionView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const showRecharge = ref(false);
const amountFen = ref<number>(PRESETS_FEN[0]);
const submitting = ref(false);
/** 待确认的充值单号：拉起支付后轮询入账结果 */
let pendingOutTradeNo = '';

const presets = PRESETS_FEN as readonly number[];

onShareAppMessage(() => ({
  title: '我的钱包',
  path: '/pages/home/home',
}));

onLoad(() => {
  // useRequireLogin 已在 onShow 守卫
});

onShow(() => {
  if (!ensureLoggedIn()) {
    return;
  }
  void refresh();
});

onReachBottom(() => {
  void loadMore();
});

async function refresh(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  page.value = 1;
  try {
    const [walletView, txnPage] = await Promise.all([
      walletApi.mine(),
      walletApi.transactions(1, PAGE_SIZE),
    ]);
    wallet.value = walletView;
    transactions.value = txnPage.list;
    total.value = txnPage.total;
  } catch {
    // 错误已统一提示
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || transactions.value.length >= total.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const txnPage = await walletApi.transactions(nextPage, PAGE_SIZE);
    transactions.value = [...transactions.value, ...txnPage.list];
    page.value = nextPage;
    total.value = txnPage.total;
  } catch {
    // 错误已统一提示
  } finally {
    loadingMore.value = false;
  }
}

function txnTypeText(type: WalletTxnType): string {
  switch (type) {
    case WalletTxnType.Recharge:
      return '充值';
    case WalletTxnType.Withdraw:
      return '提现';
    case WalletTxnType.OrderPayment:
      return '订单支付';
    case WalletTxnType.OrderRefund:
      return '订单退款';
    default:
      return '其他';
  }
}

function openRecharge(): void {
  amountFen.value = PRESETS_FEN[0];
  showRecharge.value = true;
}

function requestWechatPay(jsapi: {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.requestPayment({
      provider: 'wxpay',
      // orderInfo 仅为统一类型签名的必填字段；mp-weixin 运行时按下方微信小程序字段转发 wx.requestPayment
      orderInfo: {},
      timeStamp: jsapi.timeStamp,
      nonceStr: jsapi.nonceStr,
      package: jsapi.package,
      signType: jsapi.signType,
      paySign: jsapi.paySign,
      success: () => resolve(),
      fail: (error) => {
        const cancelled = (error.errMsg ?? '').includes('cancel');
        reject(new Error(cancelled ? '已取消支付' : '支付失败'));
      },
    });
  });
}

async function submitRecharge(): Promise<void> {
  if (submitting.value) {
    return;
  }
  submitting.value = true;
  try {
    // 服务端按网关开关把 wechat 映射到实际渠道；返回 jsapiParams 时小程序内直接拉起收银台
    const result = await walletApi.recharge({
      amountFen: amountFen.value,
      provider: PaymentProvider.Wechat,
    });
    pendingOutTradeNo = result.outTradeNo;
    if (result.jsapiParams) {
      await requestWechatPay(result.jsapiParams);
      await confirmRecharge();
    } else if (result.qrCode) {
      // 小程序内不得展示/引导外部扫码支付：明确提示改用其他渠道
      toast('小程序暂不支持扫码充值，请使用 H5 端或联系客服');
    }
  } catch {
    // 错误已统一提示
  } finally {
    submitting.value = false;
  }
}

async function confirmRecharge(): Promise<void> {
  if (!pendingOutTradeNo) {
    return;
  }
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const status = await walletApi.rechargeStatus(pendingOutTradeNo).catch(() => null);
    if (status?.status === RechargeStatus.Paid) {
      toast('充值成功');
      showRecharge.value = false;
      pendingOutTradeNo = '';
      await refresh();
      return;
    }
    if (status?.status === RechargeStatus.Closed) {
      pendingOutTradeNo = '';
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  toast('支付结果确认中，请稍后在流水中查看');
  showRecharge.value = false;
  pendingOutTradeNo = '';
}
</script>

<style scoped>
.wallet {
  padding: 24rpx;
}

.balance-card {
  margin-bottom: 24rpx;
  padding: 40rpx 32rpx;
}

.balance-label {
  display: block;
  color: #9aa6bb;
  font-size: 24rpx;
}

.balance-value {
  display: block;
  margin-top: 12rpx;
  color: #ffb020;
  font-size: 64rpx;
  font-weight: 700;
}

.balance-actions {
  display: flex;
  margin-top: 32rpx;
}

.balance-recharge {
  width: 220rpx;
}

.section {
  margin-bottom: 24rpx;
}


.txn-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(150, 165, 195, 0.1);
}

.txn-item:last-of-type {
  border-bottom: none;
}

.txn-info {
  flex: 1;
}

.txn-type {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
}

.txn-time {
  display: block;
  margin-top: 6rpx;
  color: #67738c;
  font-size: 22rpx;
}

.txn-amount {
  text-align: right;
}

.txn-value {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
  font-weight: 600;
}

.txn-in {
  color: #3dff9b;
}

.txn-balance {
  display: block;
  margin-top: 6rpx;
  color: #67738c;
  font-size: 22rpx;
}

.recharge-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(7, 10, 18, 0.7);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.recharge-panel {
  width: 100%;
  border-radius: 24rpx 24rpx 0 0;
  padding: 40rpx 32rpx calc(40rpx + env(safe-area-inset-bottom));
}

.amount-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin: 24rpx 0 32rpx;
}

.amount-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.amount-item.active {
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.1);
}

.amount-text {
  color: #9aa6bb;
  font-size: 28rpx;
}

.amount-text-active {
  color: #ffb020;
  font-weight: 600;
}

.recharge-tip {
  display: block;
  margin-top: 16rpx;
  color: #67738c;
  font-size: 22rpx;
  text-align: center;
}

.loading-more {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
}
</style>
