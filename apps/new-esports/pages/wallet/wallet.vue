<template>
  <view class="wallet">
    <!-- 未登录：展示登录引导（钱包数据均需登录） -->
    <view
      v-if="!isLoggedIn"
      class="card guide"
    >
      <text class="type-title guide-title">
        登录后查看余额与流水
      </text>
      <text class="type-small text-muted guide-text">
        余额用于下单支付与退款入账，明细可追溯到每一笔订单。
      </text>
      <view
        class="btn-primary guide-action"
        @tap="gotoLogin"
      >
        <text>去登录</text>
      </view>
    </view>

    <template v-else>
      <!-- 余额：单一大数字 -->
      <view class="card card-solid balance">
        <text class="type-label">账户余额（元）</text>
        <text class="type-num balance-value">
          {{ balanceText }}
        </text>
        <text class="type-small text-muted balance-hint">
          余额用于下单支付与退款入账；提现随支付渠道开通后开放
        </text>
      </view>

      <!-- 充值：小程序内走微信虚拟支付（代币充值），回调后入账余额 -->
      <view class="section recharge">
        <view class="section-head">
          <text class="type-label section-title">
            微信充值
          </text>
          <text class="type-label">回调到账</text>
        </view>

        <template v-if="virtualPaySupported">
          <view class="amounts">
            <view
              v-for="option in rechargeOptions"
              :key="option"
              class="amount"
              :class="{ 'amount--active': option === amountFen }"
              @tap="amountFen = option"
            >
              <text
                class="type-num amount-text"
                :class="{ 'amount-text--active': option === amountFen }"
              >
                {{ fenToYuan(option) }}
              </text>
              <text class="type-label amount-unit">
                元
              </text>
            </view>
          </view>
          <view
            class="btn-primary recharge-action"
            :class="{ 'is-disabled': recharging }"
            @tap="onRecharge"
          >
            <text>{{ recharging ? '支付中…' : `充值 ¥${fenToYuan(amountFen)}` }}</text>
          </view>
          <text class="type-small text-faint recharge-hint">
            小程序内微信支付，支付成功即时入账余额；下单时可直接用余额支付
          </text>
        </template>
        <text
          v-else
          class="type-small text-faint recharge-hint"
        >
          微信充值需在微信小程序内使用（当前环境不支持虚拟支付）
        </text>
      </view>

      <view class="section">
        <view class="section-head">
          <text class="type-label section-title">
            余额流水
          </text>
          <text
            v-if="total > 0"
            class="type-label"
          >
            共 {{ total }} 条
          </text>
        </view>

        <view
          v-if="transactions.length > 0"
          class="txns"
        >
          <view
            v-for="txn in transactions"
            :key="txn.id"
            class="txn"
          >
            <view class="txn-left">
              <text class="type-body txn-type">
                {{ txnTypeText(txn.type) }}
              </text>
              <text class="type-small text-faint txn-time">
                {{ formatDateTime(txn.createdAt) }}
              </text>
            </view>
            <view class="txn-right">
              <text
                class="type-num txn-amount"
                :class="{ 'txn-amount--out': txn.direction === 'out' }"
              >
                {{ txn.direction === 'in' ? '+' : '-' }}¥{{ txn.amountYuan }}
              </text>
              <text class="type-small text-faint txn-balance">
                余额 ¥{{ txn.balanceAfterYuan }}
              </text>
            </view>
          </view>
        </view>
        <text
          v-else-if="!loading"
          class="type-small text-faint txn-empty"
        >
          暂无流水记录
        </text>

        <text
          v-if="loadingMore"
          class="type-label list-foot"
        >
          加载中
        </text>
        <text
          v-else-if="transactions.length > 0 && !hasMore"
          class="type-label list-foot"
        >
          已展示全部
        </text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onReachBottom, onShow } from '@dcloudio/uni-app';
import { walletApi } from '@/api/wallet.api';
import { auth } from '@/stores/auth';
import { wallet } from '@/stores/wallet';
import { fenToYuan } from '@/utils/format';
import { toast } from '@/utils/toast';
import {
  getWxLoginCode,
  requestVirtualPayment,
  VIRTUAL_PAY_SUPPORTED,
} from '@/utils/wx-virtual-pay';
import { PaymentProvider, RechargeStatus } from '@app/contracts';
import type { WalletTransactionView } from '@/types/wallet';
import { WalletTxnType } from '@/types/wallet';

/**
 * 钱包：余额 + 余额流水（分页）。
 * 充值/提现依赖支付渠道（小程序需服务端小程序支付渠道），当前只读展示，
 * 给出明确说明而不是不可用的按钮。
 */

const PAGE_SIZE = 20;

/** 充值档位（分）：6 / 30 / 98 / 198 元 */
const RECHARGE_OPTION_FEN = [600, 3000, 9800, 19800] as const;
/** 支付结果轮询间隔与最长等待（虚拟支付到账以服务端回调/查单为准） */
const PAY_POLL_INTERVAL_MS = 1500;
const PAY_POLL_TIMEOUT_MS = 15000;

/** 流水类型中文文案（与 packages/contracts 的 WalletTxnType 一一对应） */
const TXN_TYPE_TEXT: Record<string, string> = {
  [WalletTxnType.Recharge]: '余额充值',
  [WalletTxnType.Withdraw]: '余额提现',
  [WalletTxnType.OrderPayment]: '订单支付',
  [WalletTxnType.OrderRefund]: '订单退款',
  [WalletTxnType.Adjust]: '平台调整',
  [WalletTxnType.Commission]: '订单提成',
  [WalletTxnType.Deposit]: '押金缴纳',
  [WalletTxnType.DepositRefund]: '押金退还',
  [WalletTxnType.Penalty]: '罚款扣除',
  [WalletTxnType.InviteReward]: '邀请奖励',
};

const { isLoggedIn, restore } = auth;
const { mine, refresh: refreshWallet } = wallet;

const transactions = ref<WalletTransactionView[]>([]);
const total = ref(0);
const nextPage = ref(2);
const hasMore = ref(true);
const loading = ref(true);
const loadingMore = ref(false);
const initialized = ref(false);

const balanceText = computed(() => {
  const data = mine.value;
  if (!data) {
    return '--';
  }
  return data.balanceYuan || fenToYuan(data.balanceFen);
});

onShow(async () => {
  await restore();
  if (!isLoggedIn.value) {
    initialized.value = false;
    return;
  }
  // 首次进入（或登录后回到本页）加载余额与首屏流水
  if (!initialized.value) {
    initialized.value = true;
    void refreshWallet();
    void reloadTransactions();
  }
});

function txnTypeText(type: WalletTxnType): string {
  return TXN_TYPE_TEXT[type] ?? '余额变动';
}

async function reloadTransactions(): Promise<void> {
  loading.value = true;
  try {
    const result = await walletApi.transactions(1, PAGE_SIZE);
    transactions.value = result.list;
    total.value = result.total;
    nextPage.value = 2;
    hasMore.value = result.list.length < result.total;
  } catch {
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

/** 触底加载下一页流水 */
async function loadMore(): Promise<void> {
  if (!isLoggedIn.value || loading.value || loadingMore.value || !hasMore.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const result = await walletApi.transactions(nextPage.value, PAGE_SIZE);
    transactions.value = [...transactions.value, ...result.list];
    total.value = result.total;
    nextPage.value += 1;
    hasMore.value = transactions.value.length < result.total;
  } catch {
    // 接口错误已静默（silent），保留已加载内容
  } finally {
    loadingMore.value = false;
  }
}

onReachBottom(() => {
  void loadMore();
});

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/login' });
}

/**
 * 微信充值（虚拟支付 · 代币充值）：
 * wx.login 取 code → 服务端签名并落充值单 → wx.requestVirtualPayment 拉起收银台 →
 * 成功后轮询充值单状态（回调入账），再刷新余额与流水。
 */
async function onRecharge(): Promise<void> {
  if (recharging.value) {
    return;
  }
  recharging.value = true;
  try {
    const loginCode = await getWxLoginCode();
    const result = await walletApi.recharge({
      amountFen: amountFen.value,
      provider: PaymentProvider.WechatVirtual,
      loginCode,
    });
    if (!result.virtualPayParams) {
      throw new Error('未获取到支付拉起参数，请稍后重试');
    }
    await requestVirtualPayment(result.virtualPayParams);
    const paid = await waitRechargePaid(result.outTradeNo);
    toast(paid ? '充值成功，余额已到账' : '支付已提交，到账可能有延迟，请稍后刷新');
    await refreshWallet();
    await reloadTransactions();
  } catch (error) {
    const message = error instanceof Error ? error.message : '充值失败，请稍后重试';
    // 「已取消支付」不视为错误提示，其余错误统一提示
    if (!message.includes('已取消支付')) {
      toast(message);
    }
  } finally {
    recharging.value = false;
  }
}

/** 轮询充值单状态直至入账或超时（回调未达时由服务端主动查单兜底） */
async function waitRechargePaid(outTradeNo: string): Promise<boolean> {
  const deadline = Date.now() + PAY_POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const status = await walletApi.rechargeStatus(outTradeNo);
      if (status.status === RechargeStatus.Paid) {
        return true;
      }
      if (status.status === RechargeStatus.Closed) {
        return false;
      }
    } catch {
      // 查询失败继续重试
    }
    await new Promise((resolve) => setTimeout(resolve, PAY_POLL_INTERVAL_MS));
  }
  return false;
}
</script>

<style scoped>
.wallet {
  padding: 40rpx 32rpx 64rpx;
  box-sizing: border-box;
}

/* ===== 未登录引导 ===== */
.guide-title {
  display: block;
  color: var(--c-text);
}

.guide-text {
  display: block;
  margin-top: 16rpx;
}

.guide-action {
  margin-top: 40rpx;
  width: 320rpx;
}

/* ===== 余额 ===== */
.balance-value {
  display: block;
  margin-top: 20rpx;
  color: var(--c-text);
  font-size: 72rpx;
  font-weight: 400;
  line-height: 1;
}

.balance-hint {
  display: block;
  margin-top: 24rpx;
}

/* ===== 充值 ===== */
.recharge-action {
  margin-top: 32rpx;
}

.amounts {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;
}

.amount {
  min-width: 150rpx;
  padding: 24rpx 28rpx;
  margin: 0 20rpx 20rpx 0;
  display: flex;
  align-items: baseline;
  justify-content: center;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
}

.amount--active {
  border-color: var(--c-text);
}

.amount-text {
  color: var(--c-text-secondary);
  font-size: 34rpx;
}

.amount-text--active {
  color: var(--c-text);
}

.amount-unit {
  margin-left: 6rpx;
}

.recharge-hint {
  display: block;
  margin-top: 20rpx;
}

/* ===== 流水 ===== */
.section {
  margin-top: 48rpx;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid var(--c-border);
}

.section-title {
  color: var(--c-text);
}

.txn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}

.txn-left {
  flex: 1;
  min-width: 0;
}

.txn-type {
  display: block;
  color: var(--c-text);
}

.txn-time {
  display: block;
  margin-top: 8rpx;
}

.txn-right {
  flex-shrink: 0;
  margin-left: 24rpx;
  text-align: right;
}

/* 入账以纯白强调，出账降为次级灰（界面不使用红绿等色相） */
.txn-amount {
  display: block;
  color: var(--c-text);
  font-size: 32rpx;
  font-weight: 500;
}

.txn-amount--out {
  color: var(--c-text-muted);
}

.txn-balance {
  display: block;
  margin-top: 8rpx;
}

.txn-empty {
  display: block;
  padding: 80rpx 0;
  text-align: center;
}

.list-foot {
  display: block;
  padding: 32rpx 0 8rpx;
  text-align: center;
}
</style>
