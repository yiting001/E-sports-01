<template>
  <view
    v-if="order"
    class="detail"
  >
    <view class="card status-card">
      <text
        class="status-text"
        :class="{ 'status-pending': order.status === 'pending_payment' }"
      >
        {{ ORDER_STATUS_TEXT[order.status] }}
      </text>
      <text class="status-no">
        订单号：{{ order.orderNo }}
      </text>
      <text
        v-if="order.status === 'pending_payment'"
        class="status-hint"
      >
        微信支付到账略有延迟，支付完成后本页会自动确认
      </text>
    </view>

    <view class="card section">
      <view class="product-row">
        <image
          v-if="order.productCover"
          class="product-cover"
          :src="order.productCover"
          mode="aspectFill"
        />
        <view
          v-else
          class="product-cover product-cover-fallback"
        >
          <text class="cover-glyph">
            ▲
          </text>
        </view>
        <view class="product-info">
          <text class="product-title">
            {{ order.productTitle }}
          </text>
          <text class="product-quantity">
            × {{ order.quantity }}
          </text>
        </view>
        <text class="product-amount">
          ¥{{ order.amountYuan }}
        </text>
      </view>
      <view class="meta">
        <text class="meta-label">
          支付方式
        </text>
        <text class="meta-value">
          {{ ORDER_PAYMENT_METHOD_TEXT[order.provider] }}
        </text>
      </view>
      <view class="meta">
        <text class="meta-label">
          游戏 ID
        </text>
        <text class="meta-value">
          {{ order.gameAccountId }}
        </text>
      </view>
      <view
        v-if="order.gameTextId"
        class="meta"
      >
        <text class="meta-label">
          文本 ID
        </text>
        <text class="meta-value">
          {{ order.gameTextId }}
        </text>
      </view>
      <view
        v-if="order.serviceRegion"
        class="meta"
      >
        <text class="meta-label">
          区服
        </text>
        <text class="meta-value">
          {{ regionLabel(order.serviceRegion) }}
        </text>
      </view>
      <view
        v-if="order.remark"
        class="meta"
      >
        <text class="meta-label">
          备注
        </text>
        <text class="meta-value">
          {{ order.remark }}
        </text>
      </view>
      <view
        v-if="order.discountBp < 10000"
        class="meta"
      >
        <text class="meta-label">
          会员折扣
        </text>
        <text class="meta-value">
          {{ (order.discountBp / 100).toFixed(0) }} 折档
        </text>
      </view>
      <view
        v-if="order.couponDeductionFen > 0"
        class="meta"
      >
        <text class="meta-label">
          券抵扣
        </text>
        <text class="meta-value">
          -¥{{ fenToYuan(order.couponDeductionFen) }}
        </text>
      </view>
      <view
        v-if="order.originalAmountFen !== order.amountFen"
        class="meta"
      >
        <text class="meta-label">
          折前价
        </text>
        <text class="meta-value">
          ¥{{ fenToYuan(order.originalAmountFen) }}
        </text>
      </view>
    </view>

    <view
      v-if="order.refund"
      class="card section"
    >
      <text class="section-title">
        退款进度
      </text>
      <text class="refund-status">
        {{ ORDER_REFUND_STATUS_TEXT[order.refund.status] }}
      </text>
      <text
        v-if="order.refund.rejectReason"
        class="refund-reason"
      >
        驳回原因：{{ order.refund.rejectReason }}
      </text>
      <text
        v-else-if="order.refund.failReason"
        class="refund-reason"
      >
        失败原因：{{ order.refund.failReason }}
      </text>
    </view>

    <view
      v-if="order.boosterName"
      class="card section"
    >
      <text class="section-title">
        服务打手
      </text>
      <text class="booster-name">
        {{ order.boosterName }}
      </text>
    </view>

    <view class="footer">
      <button
        v-if="order.canRequestRefund"
        class="btn-ghost footer-btn"
        @tap="showRefundInput = !showRefundInput"
      >
        申请退款
      </button>
      <button
        v-if="order.status === 'pending_payment'"
        class="btn-ghost footer-btn"
        @tap="cancelOrder"
      >
        取消订单
      </button>
      <button
        v-if="order.status === 'pending_payment'"
        class="btn-primary footer-btn footer-pay"
        @tap="confirmPay"
      >
        查询支付结果
      </button>
    </view>

    <refund-request
      v-if="showRefundInput"
      @submit="submitRefund"
    />
  </view>
  <empty-state
    v-else-if="!loading"
    text="订单不存在"
  />
</template>

<script setup lang="ts">
import { onLoad, onUnload, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { OrderView } from '@app/contracts';
import {
  BOOSTER_SERVICE_REGION,
  ORDER_PAYMENT_METHOD_TEXT,
  ORDER_REFUND_STATUS_TEXT,
  ORDER_STATUS_TEXT,
} from '@app/contracts';
import { orderApi } from '@/api/order.api';
import emptyState from '@/components/empty-state.vue';
import refundRequest from '@/components/refund-request.vue';
import { fenToYuan } from '@/utils/format';
import { toast } from '@/utils/toast';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_TIMES = 20;

const order = ref<OrderView | null>(null);
const loading = ref(true);
const showRefundInput = ref(false);
let pollTimer: ReturnType<typeof setTimeout> | null = null;
let pollCount = 0;

onShareAppMessage(() => ({
  title: '订单详情',
  path: '/pages/home/home',
}));

onLoad(async (options) => {
  const id = options?.id ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  await reload(id);
  schedulePoll(id);
});

onUnload(() => {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
});

async function reload(id: string): Promise<void> {
  try {
    order.value = await orderApi.detail(id);
  } catch {
    order.value = null;
  } finally {
    loading.value = false;
  }
}

/** 待付款订单轮询渠道查单，支付到账后自动刷新状态 */
function schedulePoll(id: string): void {
  if (pollTimer) {
    clearTimeout(pollTimer);
  }
  pollTimer = setTimeout(async () => {
    pollCount += 1;
    const current = order.value;
    if (current?.status !== 'pending_payment' || pollCount > POLL_MAX_TIMES) {
      return;
    }
    const latest = await orderApi.payQuery(id).catch(() => null);
    if (latest) {
      order.value = latest;
      if (latest.status !== 'pending_payment') {
        toast('支付已确认');
        return;
      }
    }
    schedulePoll(id);
  }, POLL_INTERVAL_MS);
}

function regionLabel(region: string): string {
  if (region === BOOSTER_SERVICE_REGION.Mobile) {
    return '手机端';
  }
  if (region === BOOSTER_SERVICE_REGION.Pc) {
    return '电脑端';
  }
  return region;
}

async function cancelOrder(): Promise<void> {
  const current = order.value;
  if (!current) {
    return;
  }
  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: '取消订单',
      content: '确定取消这笔待付款订单吗？',
      confirmColor: '#ffb020',
      success: (result) => resolve(result.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) {
    return;
  }
  order.value = await orderApi.cancel(current.id);
  toast('订单已取消');
}

async function confirmPay(): Promise<void> {
  const current = order.value;
  if (!current) {
    return;
  }
  const latest = await orderApi.payQuery(current.id, { silent: false });
  order.value = latest;
  toast(
    latest.status === 'pending_payment' ? '暂未查询到支付结果' : '支付已确认',
  );
}

async function submitRefund(reason: string): Promise<void> {
  const current = order.value;
  if (!current) {
    return;
  }
  if (reason.length < 5) {
    toast('请填写退款原因（不少于 5 个字）');
    return;
  }
  order.value = await orderApi.requestRefund(current.id, { reason });
  showRefundInput.value = false;
  toast('退款申请已提交，等待审核');
}
</script>

<style scoped>
.detail {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.status-card {
  margin-bottom: 24rpx;
}

.status-text {
  display: block;
  color: #e9eef6;
  font-size: 40rpx;
  font-weight: 700;
}

.status-pending {
  color: #ffb020;
}

.status-no {
  display: block;
  margin-top: 12rpx;
  color: #67738c;
  font-size: 24rpx;
}

.status-hint {
  display: block;
  margin-top: 12rpx;
  color: #9aa6bb;
  font-size: 24rpx;
}

.section {
  margin-bottom: 24rpx;
}

.section-title {
  display: block;
  color: #9aa6bb;
  font-size: 24rpx;
  margin-bottom: 12rpx;
}

.product-row {
  display: flex;
  gap: 20rpx;
  align-items: center;
  margin-bottom: 20rpx;
}

.product-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #071510;
}

.product-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.cover-glyph {
  color: #3dff9b;
  font-size: 36rpx;
}

.product-info {
  flex: 1;
  min-width: 0;
}

.product-title {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
  line-height: 1.4;
}

.product-quantity {
  display: block;
  margin-top: 8rpx;
  color: #67738c;
  font-size: 24rpx;
}

.product-amount {
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.meta {
  display: flex;
  margin-top: 12rpx;
}

.meta-label {
  width: 160rpx;
  color: #67738c;
  font-size: 24rpx;
  flex-shrink: 0;
}

.meta-value {
  flex: 1;
  color: #9aa6bb;
  font-size: 24rpx;
  word-break: break-all;
}

.refund-status {
  color: #e9eef6;
  font-size: 28rpx;
}

.refund-reason {
  display: block;
  margin-top: 8rpx;
  color: #ff5449;
  font-size: 24rpx;
}

.booster-name {
  color: #e9eef6;
  font-size: 28rpx;
}

.footer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #131926;
  border-top: 1rpx solid rgba(150, 165, 195, 0.16);
}

.footer-btn {
  flex: 1;
}

.footer-pay {
  border: none;
}
</style>
