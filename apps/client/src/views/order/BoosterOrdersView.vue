<script setup lang="ts">
/**
 * 打手订单中心（打手身份一级 Tab）：顶部状态 tabs（全部/服务中/已完成），
 * 分页列出本人接下的订单，点卡片可看详情（备注/附件/账号信息），
 * 服务中订单可标记完成；到底加载更多。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ORDER_STATUS_TEXT, OrderStatus, type OrderView } from '@app/contracts';
import BoosterOrderCard from '@/components/order/BoosterOrderCard.vue';
import OrderStatusTabs from '@/components/order/OrderStatusTabs.vue';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';

const PAGE_SIZE = 10;

const router = useRouter();
const toast = useToast();

const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
/** 当前选中的状态 tab；undefined 为全部 */
const activeStatus = ref<OrderStatus | undefined>(undefined);

/** 状态 tabs：打手侧只有服务中/已完成两种流转态 */
const STATUS_TABS: Array<{ label: string; value?: OrderStatus }> = [
  { label: '全部', value: undefined },
  { label: ORDER_STATUS_TEXT[OrderStatus.Serving], value: OrderStatus.Serving },
  { label: ORDER_STATUS_TEXT[OrderStatus.Completed], value: OrderStatus.Completed },
];

function switchTab(status?: OrderStatus): void {
  if (activeStatus.value === status) {
    return;
  }
  activeStatus.value = status;
  orders.value = [];
  void load(true);
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
    const result = await orderApi.boosterMine(
      page.value,
      PAGE_SIZE,
      activeStatus.value,
    );
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

/** 完成服务中的订单 */
async function complete(order: OrderView): Promise<void> {
  await orderApi.complete(order.id);
  toast.show('订单已完成');
  await load(true);
}
/** 点击卡片 → 打手订单详情页 */
function openDetail(order: OrderView): void {
  router.push({ name: 'booster-order-detail', params: { id: order.id } });
}

onMounted(() => void load(true));
</script>

<template>
  <div class="center">
    <header class="head">
      <h2 class="title">
        订单中心
      </h2>
      <span
        v-if="total > 0"
        class="count"
      >共 {{ total }} 单</span>
    </header>

    <OrderStatusTabs
      :tabs="STATUS_TABS"
      :active-status="activeStatus"
      @change="switchTab"
    />

    <p
      v-if="!loading && orders.length === 0"
      class="hint card"
    >
      {{ activeStatus ? `暂无${ORDER_STATUS_TEXT[activeStatus]}的订单` : '暂无接单记录，去接单大厅抢单吧' }}
    </p>

    <BoosterOrderCard
      v-for="order in orders"
      :key="order.id"
      :order="order"
      :action-label="order.status === OrderStatus.Serving ? '完成订单' : undefined"
      @action="complete"
      @open="openDetail"
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
</template>

<style scoped>
.center {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 4px 0;
}

.title {
  font-size: 18px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 1px;
}

.count {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 32px 16px;
}

.more-wrap {
  display: flex;
  justify-content: center;
}

.more {
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

@media (min-width: 768px) {
  .center {
    max-width: 860px;
    margin: 0 auto;
    width: 100%;
  }
}
</style>
