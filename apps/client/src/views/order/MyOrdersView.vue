<script setup lang="ts">
/**
 * 我的订单页（全屏）：顶部状态 tabs 切换（全部/待付款/…），分页列出本人订单
 * （商品快照/数量/金额/状态），待付款订单可取消，已完成订单可评价（一单一评）；
 * 到底加载更多。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ORDER_STATUS_TEXT, OrderStatus, type OrderView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import OrderCard from '@/components/order/OrderCard.vue';
import OrderStatusTabs from '@/components/order/OrderStatusTabs.vue';
import ReviewDialog from '@/components/review/ReviewDialog.vue';
import { orderApi } from '@/api/order.api';
import { reviewApi } from '@/api/review.api';
import { useToast } from '@/composables/use-toast';

const PAGE_SIZE = 10;

const router = useRouter();
const toast = useToast();

const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
/** 已评价的订单 id 集合（控制「评价/已评价」展示） */
const reviewedIds = ref<Set<string>>(new Set());
/** 当前正在评价的订单；非空时展示评价弹层 */
const reviewingOrder = ref<OrderView | null>(null);
/** 当前选中的状态 tab；undefined 为全部 */
const activeStatus = ref<OrderStatus | undefined>(undefined);

/** 状态 tabs：全部 + 各订单状态（文案复用 ORDER_STATUS_TEXT） */
const STATUS_TABS: Array<{ label: string; value?: OrderStatus }> = [
  { label: '全部', value: undefined },
  ...(Object.keys(ORDER_STATUS_TEXT) as OrderStatus[]).map((status) => ({
    label: ORDER_STATUS_TEXT[status],
    value: status,
  })),
];

function switchTab(status?: OrderStatus): void {
  if (activeStatus.value === status) {
    return;
  }
  activeStatus.value = status;
  orders.value = [];
  void load(true);
}

/** 同步已完成订单的评价状态 */
async function loadReviewed(list: OrderView[]): Promise<void> {
  const completedIds = list
    .filter((order) => order.status === OrderStatus.Completed)
    .map((order) => order.id);
  if (completedIds.length === 0) {
    return;
  }
  const ids = await reviewApi.reviewedOrderIds(completedIds);
  reviewedIds.value = new Set([...reviewedIds.value, ...ids]);
}

async function load(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
      reviewedIds.value = new Set();
    }
    const result = await orderApi.mine(
      page.value,
      PAGE_SIZE,
      activeStatus.value,
    );
    orders.value = reset ? result.list : [...orders.value, ...result.list];
    total.value = result.total;
    await loadReviewed(result.list);
  } finally {
    loading.value = false;
  }
}

function loadMore(): void {
  if (orders.value.length >= total.value) {
    return;
  }
  page.value += 1;
  void load();
}

async function cancel(order: OrderView): Promise<void> {
  await orderApi.cancel(order.id);
  toast.show('订单已取消');
  await load(true);
}

/** 评价提交成功：标记已评价并关闭弹层 */
function onReviewed(): void {
  if (reviewingOrder.value) {
    reviewedIds.value = new Set([...reviewedIds.value, reviewingOrder.value.id]);
  }
  reviewingOrder.value = null;
}

onMounted(() => void load(true));
</script>

<template>
  <div class="orders-page client-page">
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
        <span class="name">我的订单</span>
        <span
          v-if="total > 0"
          class="count"
        >共 {{ total }} 笔</span>
      </div>
    </header>

    <OrderStatusTabs
      :tabs="STATUS_TABS"
      :active-status="activeStatus"
      @change="switchTab"
    />

    <div class="scroll">
      <div class="content">
        <p
          v-if="!loading && orders.length === 0"
          class="hint card"
        >
          {{ activeStatus ? `暂无${ORDER_STATUS_TEXT[activeStatus]}的订单` : '暂无订单，去首页选购陪玩服务吧' }}
        </p>

        <OrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          :reviewed="reviewedIds.has(order.id)"
          @cancel="cancel"
          @review="reviewingOrder = $event"
        />

        <div
          v-if="orders.length < total"
          class="more-wrap"
        >
          <button
            class="more"
            :disabled="loading"
            @click="loadMore"
          >
            {{ loading ? '加载中…' : '加载更多' }}
          </button>
        </div>
      </div>
    </div>

    <ReviewDialog
      v-if="reviewingOrder"
      :order="reviewingOrder"
      @submitted="onReviewed"
      @close="reviewingOrder = null"
    />
  </div>
</template>

<style scoped>
.orders-page {
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
  padding: 14px 16px;
  display: flex;
  align-items: center;
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

.count {
  margin-left: auto;
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 32px 16px;
}

.more {
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.more-wrap {
  display: flex;
  justify-content: center;
}

@media (min-width: 768px) {
  .orders-page {
    position: static;
    min-height: 100vh;
    display: block;
    padding: 28px 24px 48px;
    background: transparent;
  }

  .bar {
    padding: 0;
    border-bottom: none;
    background: transparent;
  }

  .bar-inner,
  .content {
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
  }

  .bar-inner {
    min-height: 40px;
  }

  .back {
    width: 36px;
    height: 36px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
  }

  .name {
    font-size: 22px;
    letter-spacing: 0;
  }

  .count {
    padding: 4px 10px;
    border: 1px solid var(--c-border);
    background: var(--c-surface);
    color: var(--c-text-secondary);
  }

  .scroll {
    padding: 18px 0 0;
    overflow: visible;
  }

  .content {
    gap: 14px;
  }

  .more {
    padding: 8px 18px;
    font-size: 13px;
  }
}
</style>
