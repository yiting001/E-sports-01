<template>
  <view class="orders">
    <!-- 未登录：订单数据需登录 -->
    <view
      v-if="!isLoggedIn"
      class="card guide"
    >
      <text class="type-title guide-title">
        登录后查看我的订单
      </text>
      <text class="type-small text-muted guide-text">
        下单进度、打手接单与退款状态都会在这里同步。
      </text>
      <view
        class="btn-primary guide-action"
        @tap="gotoLogin"
      >
        <text>去登录</text>
      </view>
    </view>

    <template v-else>
      <!-- 状态筛选：全部 + 各订单状态 -->
      <scroll-view
        scroll-x
        class="tabs"
        :show-scrollbar="false"
        :scroll-into-view="activeTabId"
      >
        <view
          v-for="tab in statusTabs"
          :id="tab.domId"
          :key="tab.domId"
          class="tab"
          :class="{ 'tab--active': activeStatus === tab.value }"
          @tap="switchTab(tab.value)"
        >
          <text class="tab-text">
            {{ tab.label }}
          </text>
        </view>
      </scroll-view>

      <view
        v-if="orders.length > 0"
        class="list"
      >
        <view
          v-for="order in orders"
          :key="order.id"
          class="card order"
        >
          <view class="order-head">
            <text class="type-label">
              {{ order.orderNo }}
            </text>
            <text class="type-body order-status">
              {{ statusText(order.status) }}
            </text>
          </view>

          <view class="order-body">
            <image
              v-if="coverOf(order)"
              class="order-cover"
              :src="coverOf(order)"
              mode="aspectFill"
            />
            <view class="order-info">
              <text class="type-body order-title">
                {{ order.productTitle }}
              </text>
              <text class="type-small text-muted order-meta">
                {{ regionText(order.serviceRegion) }} · 数量 {{ order.quantity }}
              </text>
              <text class="type-small text-faint order-meta">
                {{ formatDateTime(order.createdAt) }}
              </text>
            </view>
          </view>

          <view class="order-foot">
            <view class="order-amount">
              <text class="type-label">实付</text>
              <text class="type-num order-amount-value">
                ¥{{ order.amountYuan }}
              </text>
              <text
                v-if="order.originalAmountFen > order.amountFen"
                class="type-small text-faint order-origin"
              >
                原价 ¥{{ fenToYuan(order.originalAmountFen) }}
              </text>
            </view>
            <view class="order-actions">
              <view
                v-if="order.conversationId"
                class="btn-ghost order-action"
                @tap="openGroupChat(order)"
              >
                <text>订单群聊</text>
              </view>
              <view
                v-if="order.status === OrderStatus.PendingPayment"
                class="btn-ghost order-action order-action--second"
                @tap="confirmCancel(order)"
              >
                <text>取消订单</text>
              </view>
            </view>
          </view>

          <text
            v-if="order.status === OrderStatus.PendingPayment"
            class="type-small text-faint order-hint"
          >
            渠道支付需在公众号完成；余额支付随下一次下单一起结算
          </text>
        </view>
      </view>

      <view
        v-else-if="!loading"
        class="empty"
      >
        暂无{{ activeStatus ? statusText(activeStatus) : '' }}订单
      </view>

      <text
        v-if="loadingMore"
        class="type-label list-foot"
      >
        加载中
      </text>
      <text
        v-else-if="orders.length > 0 && !hasMore"
        class="type-label list-foot"
      >
        已展示全部
      </text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onPullDownRefresh, onReachBottom, onShow } from '@dcloudio/uni-app';
import { orderApi } from '@/api/order.api';
import { auth } from '@/stores/auth';
import { ORDER_STATUS_TEXT, OrderStatus, type OrderView } from '@/types/order';
import { fenToYuan, formatDateTime } from '@/utils/format';
import { resolveMediaUrl } from '@/utils/media-url';
import { toast } from '@/utils/toast';

/**
 * 我的订单：状态筛选（全部 + 8 种状态）× 分页列表。
 * 每张卡片展示商品快照、区服与数量、实付金额与下单时间；
 * 待付款订单可取消（渠道支付需在公众号完成，余额支付随下次下单结算）。
 */

const PAGE_SIZE = 10;

/** 状态签：全部 + 契约里的全部状态（文案复用 ORDER_STATUS_TEXT） */
const statusTabs = computed(() =>
  [
    { domId: 'tab-all', label: '全部', value: undefined as OrderStatus | undefined },
    ...(Object.keys(ORDER_STATUS_TEXT) as OrderStatus[]).map((status) => ({
      domId: `tab-${status}`,
      label: ORDER_STATUS_TEXT[status],
      value: status as OrderStatus | undefined,
    })),
  ].map((tab) => ({ ...tab })),
);

const { isLoggedIn, restore } = auth;

const orders = ref<OrderView[]>([]);
const activeStatus = ref<OrderStatus | undefined>(undefined);
const nextPage = ref(2);
const total = ref(0);
const hasMore = ref(true);
const loading = ref(true);
const loadingMore = ref(false);
const initialized = ref(false);

/** 当前激活状态签的锚点 id（切换后横向滚动到可见位置） */
const activeTabId = computed(() => (activeStatus.value ? `tab-${activeStatus.value}` : 'tab-all'));

function statusText(status: OrderStatus): string {
  return ORDER_STATUS_TEXT[status] ?? status;
}

function regionText(region: string): string {
  if (region === 'delta-pc') {
    return '电脑端';
  }
  if (region === 'delta-mobile') {
    return '手机端';
  }
  return '未指定区服';
}

function coverOf(order: OrderView): string {
  return resolveMediaUrl(order.productCover);
}

onShow(async () => {
  await restore();
  if (!isLoggedIn.value) {
    initialized.value = false;
    return;
  }
  if (initialized.value) {
    return;
  }
  initialized.value = true;
  void reload();
});

/** 首屏/筛选切换：重置并加载第 1 页 */
async function reload(): Promise<void> {
  loading.value = true;
  try {
    const result = await orderApi.mine(1, PAGE_SIZE, activeStatus.value);
    orders.value = result.list;
    total.value = result.total;
    nextPage.value = 2;
    hasMore.value = result.list.length < result.total;
  } catch {
    orders.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (!isLoggedIn.value || loading.value || loadingMore.value || !hasMore.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const result = await orderApi.mine(nextPage.value, PAGE_SIZE, activeStatus.value);
    orders.value = [...orders.value, ...result.list];
    total.value = result.total;
    nextPage.value += 1;
    hasMore.value = orders.value.length < result.total;
  } catch {
    // 错误已统一提示
  } finally {
    loadingMore.value = false;
  }
}

function switchTab(status?: OrderStatus): void {
  if (activeStatus.value === status) {
    return;
  }
  activeStatus.value = status;
  orders.value = [];
  hasMore.value = true;
  void reload();
}

onReachBottom(() => {
  void loadMore();
});

onPullDownRefresh(async () => {
  if (isLoggedIn.value) {
    await reload();
  }
  uni.stopPullDownRefresh();
});

/** 取消待付款订单（二次确认） */
function confirmCancel(order: OrderView): void {
  // 注意：H5/小程序的原生 showModal 是浅色弹窗，不要传 confirmColor（白色会看不见按钮文字）
  uni.showModal({
    title: '取消订单',
    content: `确定取消订单 ${order.orderNo}？取消后不可恢复。`,
    confirmText: '确认取消',
    cancelText: '再想想',
    success: async (result) => {
      if (!result.confirm) {
        return;
      }
      try {
        await orderApi.cancel(order.id);
        toast('订单已取消');
        await reload();
      } catch {
        // 错误已统一提示
      }
    },
  });
}

function gotoLogin(): void {
  uni.navigateTo({ url: '/pages/login/login' });
}

/** 进入订单群聊（支付成功后服务端自动建群，会话 id 来自订单快照） */
function openGroupChat(order: OrderView): void {
  uni.navigateTo({
    url: `/pages/chat/chat?conversationId=${order.conversationId}&kind=group`,
  });
}
</script>

<style scoped>
.orders {
  padding: 24rpx 32rpx 64rpx;
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

/* ===== 状态签：无填充，白字 + 细下划线表示选中 ===== */
.tabs {
  white-space: nowrap;
  margin-bottom: 24rpx;
}

.tab {
  display: inline-block;
  margin-right: 40rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid transparent;
}

.tab--active {
  border-bottom-color: var(--c-text);
}

.tab-text {
  color: var(--c-text-secondary);
  font-size: 26rpx;
  letter-spacing: 0.35px;
}

.tab--active .tab-text {
  color: var(--c-text);
}

/* ===== 订单卡 ===== */
.list {
  display: flex;
  flex-direction: column;
}

.order {
  margin-bottom: 24rpx;
}

.order-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.order-status {
  color: var(--c-text);
}

.order-body {
  display: flex;
  margin-top: 28rpx;
}

.order-cover {
  width: 132rpx;
  height: 132rpx;
  flex-shrink: 0;
  border-radius: var(--radius-md);
  background-color: var(--c-bg);
}

.order-info {
  flex: 1;
  min-width: 0;
  margin-left: 24rpx;
}

.order-title {
  display: block;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-meta {
  display: block;
  margin-top: 8rpx;
}

.order-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-top: 28rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid var(--c-border);
}

.order-amount {
  display: flex;
  align-items: baseline;
}

.order-amount-value {
  margin-left: 12rpx;
  color: var(--c-text);
  font-size: 36rpx;
  font-weight: 500;
}

.order-origin {
  margin-left: 16rpx;
  text-decoration: line-through;
}

.order-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.order-action {
  width: 196rpx;
  height: 72rpx;
  flex-shrink: 0;
  font-size: 26rpx;
}

.order-action--second {
  margin-left: 16rpx;
}

.order-hint {
  display: block;
  margin-top: 20rpx;
}

.list-foot {
  display: block;
  padding: 32rpx 0 8rpx;
  text-align: center;
}
</style>
