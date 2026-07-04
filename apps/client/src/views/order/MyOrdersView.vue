<script setup lang="ts">
/**
 * 我的订单页（全屏）：分页列出本人订单（商品快照/数量/金额/状态），
 * 待付款订单可取消；下拉到底加载更多。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
  ORDER_STATUS_TEXT,
  OrderStatus,
  type OrderView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';

const PAGE_SIZE = 10;

const router = useRouter();
const toast = useToast();

const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);

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

async function load(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
    }
    const result = await orderApi.mine(page.value, PAGE_SIZE);
    orders.value = reset ? result.list : [...orders.value, ...result.list];
    total.value = result.total;
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

onMounted(() => void load(true));
</script>

<template>
  <div class="orders-page">
    <header class="bar">
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
    </header>

    <div class="scroll">
      <p
        v-if="!loading && orders.length === 0"
        class="hint"
      >
        暂无订单，去首页选购陪玩服务吧
      </p>

      <article
        v-for="order in orders"
        :key="order.id"
        class="order card"
      >
        <div class="head">
          <span class="no">{{ order.orderNo }}</span>
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
              数量 ×{{ order.quantity }} · {{ formatTime(order.createdAt) }}
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
      </article>

      <button
        v-if="orders.length < total"
        class="more"
        :disabled="loading"
        @click="loadMore"
      >
        {{ loading ? '加载中…' : '加载更多' }}
      </button>
    </div>
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
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
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
  gap: 12px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 32px 0;
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

.more {
  align-self: center;
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
