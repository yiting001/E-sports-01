<template>
  <view class="orders">
    <scroll-view
      scroll-x
      class="status-tabs"
      :show-scrollbar="false"
    >
      <view
        v-for="tab in tabs"
        :key="tab.value"
        class="chip status-tab"
        :class="{ active: tab.value === activeStatus }"
        @tap="selectTab(tab.value)"
      >
        <text class="chip-text">
          {{ tab.label }}
        </text>
      </view>
    </scroll-view>

    <view class="order-list">
      <view
        v-for="order in orders"
        :key="order.id"
        class="card order-item"
        @tap="gotoDetail(order.id)"
      >
        <view class="order-head">
          <text class="order-no">
            单号 {{ order.orderNo }}
          </text>
          <text
            class="order-status"
            :class="{ 'order-status-pending': order.status === 'pending_payment' }"
          >
            {{ ORDER_STATUS_TEXT[order.status] }}
          </text>
        </view>
        <view class="order-body">
          <image
            v-if="order.productCover"
            class="order-cover"
            :src="order.productCover"
            mode="aspectFill"
          />
          <view
            v-else
            class="order-cover order-cover-fallback"
          >
            <text class="cover-glyph">
              ▲
            </text>
          </view>
          <view class="order-info">
            <text class="order-title">
              {{ order.productTitle }}
            </text>
            <text class="order-quantity">
              × {{ order.quantity }}
            </text>
          </view>
          <view class="order-amount">
            <text class="order-amount-value">
              ¥{{ order.amountYuan }}
            </text>
            <text class="order-method">
              {{ ORDER_PAYMENT_METHOD_TEXT[order.provider] }}
            </text>
          </view>
        </view>
      </view>
      <empty-state
        v-if="!loading && orders.length === 0"
        text="暂无订单"
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
  </view>
</template>

<script setup lang="ts">
import { onReachBottom, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { OrderView } from '@app/contracts';
import {
  ORDER_PAYMENT_METHOD_TEXT,
  ORDER_STATUS_TEXT,
  OrderStatus,
} from '@app/contracts';
import { orderApi } from '@/api/order.api';
import emptyState from '@/components/empty-state.vue';
import { useRequireLogin } from '@/composables/use-require-login';

const PAGE_SIZE = 10;

const tabs = [
  { value: '', label: '全部' },
  { value: OrderStatus.PendingPayment, label: '待付款' },
  { value: OrderStatus.PendingService, label: '待处理' },
  { value: OrderStatus.Serving, label: '服务中' },
  { value: OrderStatus.Completed, label: '已完成' },
  { value: OrderStatus.Refunded, label: '退款' },
] as const;

const { ensureLoggedIn } = useRequireLogin(true);

const activeStatus = ref('');
const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);

onShareAppMessage(() => ({
  title: '我的订单',
  path: '/pages/home/home',
}));

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
    const result = await orderApi.mine(
      1,
      PAGE_SIZE,
      (activeStatus.value || undefined) as OrderStatus | undefined,
    );
    orders.value = result.list;
    total.value = result.total;
  } catch {
    // 错误已统一提示
  } finally {
    loading.value = false;
  }
}

function selectTab(status: string): void {
  if (status === activeStatus.value) {
    return;
  }
  activeStatus.value = status;
  orders.value = [];
  void refresh();
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || orders.value.length >= total.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const result = await orderApi.mine(
      nextPage,
      PAGE_SIZE,
      (activeStatus.value || undefined) as OrderStatus | undefined,
    );
    orders.value = [...orders.value, ...result.list];
    page.value = nextPage;
    total.value = result.total;
  } catch {
    // 错误已统一提示
  } finally {
    loadingMore.value = false;
  }
}

function gotoDetail(orderId: string): void {
  uni.navigateTo({ url: `/pages/order/detail?id=${orderId}` });
}
</script>

<style scoped>
.orders {
  min-height: 100vh;
}

.status-tabs {
  white-space: nowrap;
  padding: 20rpx 24rpx;
  position: sticky;
  top: 0;
  background-color: #0b0e14;
  z-index: 10;
}

.status-tab {
  margin-right: 16rpx;
}

.order-list {
  padding: 8rpx 24rpx 24rpx;
}

.order-item {
  margin-bottom: 20rpx;
}

.order-head {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.order-no {
  color: #67738c;
  font-size: 22rpx;
}

.order-status {
  margin-left: auto;
  color: #9aa6bb;
  font-size: 24rpx;
}

.order-status-pending {
  color: #ffb020;
}

.order-body {
  display: flex;
  gap: 20rpx;
}

.order-cover {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
  background-color: #071510;
}

.order-cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(160deg, #14352a 0%, #0b1f18 60%, #071510 100%);
}

.cover-glyph {
  color: #3dff9b;
  font-size: 36rpx;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-title {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-quantity {
  display: block;
  margin-top: 8rpx;
  color: #67738c;
  font-size: 24rpx;
}

.order-amount {
  text-align: right;
  flex-shrink: 0;
}

.order-amount-value {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 700;
}

.order-method {
  display: block;
  margin-top: 8rpx;
  color: #67738c;
  font-size: 22rpx;
}

.loading-more {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
}
</style>
