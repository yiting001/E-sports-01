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

/** 状态 → 徽标风格（进行中金色/完成绿色/取消灰色） */
function statusClass(status: OrderStatus): string {
  if (status === OrderStatus.Cancelled) {
    return 'tag--muted';
  }
  if (status === OrderStatus.Completed) {
    return 'tag--ok';
  }
  return 'tag--accent';
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

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace('T', ' ') : '';
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
  <div class="orders-page">
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

    <nav class="tabs">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value ?? 'all'"
        class="tab"
        :class="{ 'tab--active': activeStatus === tab.value }"
        @click="switchTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="scroll">
      <div class="content">
        <p
          v-if="!loading && orders.length === 0"
          class="hint card"
        >
          {{ activeStatus ? `暂无${ORDER_STATUS_TEXT[activeStatus]}的订单` : '暂无订单，去首页选购陪玩服务吧' }}
        </p>

        <article
          v-for="order in orders"
          :key="order.id"
          class="order card"
        >
          <div class="head">
            <span class="no">订单号 {{ order.orderNo }}</span>
            <span
              class="tag"
              :class="statusClass(order.status)"
            >
              {{ ORDER_STATUS_TEXT[order.status] }}
            </span>
          </div>
          <div class="body">
            <div
              class="thumb"
              :class="{ 'thumb--image': order.productCover }"
              :style="order.productCover ? { backgroundImage: `url(${order.productCover})` } : undefined"
            >
              <AppIcon
                v-if="!order.productCover"
                name="gem"
                :size="26"
                class="thumb-icon"
              />
            </div>
            <div class="mid">
              <p class="title">
                {{ order.productTitle }}
              </p>
              <p class="sub">
                <span>数量 ×{{ order.quantity }}</span>
                <span>{{ formatTime(order.createdAt) }}</span>
              </p>
            </div>
            <span class="amount">¥{{ order.amountYuan }}</span>
          </div>
          <div
            v-if="order.status === OrderStatus.PendingPayment"
            class="actions"
          >
            <button
              class="cancel"
              @click="cancel(order)"
            >
              取消订单
            </button>
          </div>
          <div
            v-else-if="order.status === OrderStatus.Completed"
            class="actions"
          >
            <span
              v-if="reviewedIds.has(order.id)"
              class="reviewed"
            >已评价</span>
            <button
              v-else
              class="review"
              @click="reviewingOrder = order"
            >
              评价
            </button>
          </div>
        </article>

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
  background: var(--c-bg);
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

.tabs {
  flex-shrink: 0;
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  overflow-x: auto;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab {
  flex-shrink: 0;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.tab--active {
  color: var(--c-accent);
  font-weight: 800;
  font-style: italic;
  background: color-mix(in srgb, var(--c-accent) 12%, transparent);
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

.order {
  padding: 12px 14px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.no {
  font-family: var(--font-num);
  font-size: 11px;
  color: var(--c-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid currentcolor;
}

.tag--accent {
  color: var(--c-accent);
}

.tag--ok {
  color: var(--c-neon);
}

.tag--muted {
  color: var(--c-text-muted);
}

.body {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.thumb {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: var(--c-cover-bg);
  overflow: hidden;
}

.thumb--image {
  background-size: cover;
  background-position: center;
}

.thumb-icon {
  color: rgba(61, 255, 155, 0.55);
}

.mid {
  flex: 1;
  min-width: 0;
}

.title {
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sub {
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.amount {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
}

.actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.cancel {
  padding: 6px 16px;
  font-size: 12px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.review {
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-accent);
  border: 1px solid var(--c-accent);
  border-radius: var(--radius-sm);
}

.reviewed {
  padding: 6px 4px;
  font-size: 12px;
  color: var(--c-text-muted);
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
    background: transparent;
  }

  .bar {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 16px 24px;
  }

  .bar-inner,
  .content {
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
  }

  .name {
    font-size: 18px;
  }

  .scroll {
    padding: 24px 0 48px;
    overflow: visible;
  }

  .content {
    gap: 14px;
  }

  .order {
    padding: 16px;
  }

  .head {
    gap: 16px;
  }

  .no {
    font-size: 12px;
  }

  .body {
    align-items: flex-start;
    gap: 16px;
  }

  .thumb {
    width: 72px;
    height: 72px;
  }

  .title {
    font-size: 16px;
    white-space: normal;
    line-height: 1.45;
  }

  .amount {
    min-width: 108px;
    padding-top: 2px;
    text-align: right;
    font-size: 20px;
  }

  .actions {
    padding-left: 88px;
  }

  .cancel,
  .review,
  .more {
    padding: 8px 18px;
    font-size: 13px;
  }
}
</style>
