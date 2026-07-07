<script setup lang="ts">
/**
 * 接单大厅（打手身份一级 Tab）：分页浏览已下发大厅的待接单订单，
 * 点卡片可查看订单详情，点「接单」抢单成功后订单进入服务中
 * 并出现在打手订单中心；到底加载更多。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { OrderView } from '@app/contracts';
import BoosterOrderCard from '@/components/order/BoosterOrderCard.vue';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';

const PAGE_SIZE = 10;

const router = useRouter();
const toast = useToast();

const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);

async function load(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
    }
    const result = await orderApi.hall(page.value, PAGE_SIZE);
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

/** 接单：成功即从大厅移除并提示去订单中心跟进 */
async function accept(order: OrderView): Promise<void> {
  await orderApi.accept(order.id);
  toast.show('接单成功，请前往订单中心跟进服务');
  await load(true);
}

/** 点击卡片 → 大厅订单详情页 */
function openDetail(order: OrderView): void {
  router.push({ name: 'hall-order-detail', params: { id: order.id } });
}

onMounted(() => void load(true));
</script>

<template>
  <div class="hall">
    <header class="head">
      <h2 class="title">
        接单大厅
      </h2>
      <span
        v-if="total > 0"
        class="count"
      >{{ total }} 单待接</span>
    </header>

    <p
      v-if="!loading && orders.length === 0"
      class="hint card"
    >
      暂无待接订单，稍后再来看看吧
    </p>

    <BoosterOrderCard
      v-for="order in orders"
      :key="order.id"
      :order="order"
      action-label="接单"
      @action="accept"
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
.hall {
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
  .hall {
    max-width: 860px;
    margin: 0 auto;
    width: 100%;
  }
}
</style>
