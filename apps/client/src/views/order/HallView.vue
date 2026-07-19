<script setup lang="ts">
/**
 * 接单大厅（打手身份一级 Tab）：展示待接订单、持久化上下线状态，
 * 页面可见时定时刷新；下线后前端禁用接单，服务端继续执行最终门禁。
 */
import type { OrderView } from '@app/contracts';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { boosterApi } from '@/api/booster.api';
import { orderApi } from '@/api/order.api';
import AppIcon from '@/components/common/AppIcon.vue';
import BoosterOrderCard from '@/components/order/BoosterOrderCard.vue';
import { useToast } from '@/composables/use-toast';
import { useHallBadgeStore } from '@/stores/hall-badge.store';
import { createIntervalPoller, type IntervalPoller } from '@/utils/interval-poller';

const PAGE_SIZE = 10;
const MAX_REFRESH_PAGE_SIZE = 100;
const AUTO_REFRESH_INTERVAL_MS = 5_000;

const router = useRouter();
const toast = useToast();
const hallBadge = useHallBadgeStore();

const orders = ref<OrderView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const loadError = ref(false);
const hasLoaded = ref(false);
const refreshing = ref(false);
const acceptingOrderId = ref('');
const acceptingOrders = ref(false);
const availabilityLoading = ref(true);
const availabilityError = ref(false);
const availabilityUpdating = ref(false);
let poller: IntervalPoller | null = null;

const availabilityText = computed(() =>
  acceptingOrders.value ? '上线接单' : '已下线',
);

async function requestPage(
  targetPage: number,
  targetPageSize: number,
  replace: boolean,
  manual: boolean,
): Promise<boolean> {
  if (loading.value) {
    return false;
  }
  loading.value = true;
  try {
    const result = await orderApi.hall(targetPage, targetPageSize, { silent: true });
    orders.value = replace ? result.list : [...orders.value, ...result.list];
    total.value = result.total;
    hallBadge.setTotal(result.total);
    page.value = replace
      ? Math.max(1, Math.ceil(result.list.length / PAGE_SIZE))
      : targetPage;
    loadError.value = false;
    hasLoaded.value = true;
    return true;
  } catch {
    if (manual || !hasLoaded.value) {
      loadError.value = true;
    }
    if (manual) {
      toast.show('订单刷新失败，请重试');
    }
    return false;
  } finally {
    loading.value = false;
  }
}

/** 刷新已加载的可见范围，避免轮询把用户已展开的分页折回第一页。 */
async function refresh(manual: boolean): Promise<void> {
  if (manual) {
    refreshing.value = true;
  }
  try {
    const visiblePageSize = Math.min(
      MAX_REFRESH_PAGE_SIZE,
      Math.max(PAGE_SIZE, orders.value.length),
    );
    const success = await requestPage(1, visiblePageSize, true, manual);
    if (manual && success) {
      toast.show('订单已刷新');
    }
  } finally {
    if (manual) {
      refreshing.value = false;
    }
  }
}

async function loadMore(): Promise<void> {
  if (orders.value.length >= total.value) {
    return;
  }
  await requestPage(page.value + 1, PAGE_SIZE, false, true);
}

async function loadAvailability(): Promise<void> {
  availabilityLoading.value = true;
  availabilityError.value = false;
  try {
    const mine = await boosterApi.mine();
    if (!mine.record) {
      availabilityError.value = true;
      return;
    }
    acceptingOrders.value = mine.record.acceptingOrders;
  } catch {
    availabilityError.value = true;
  } finally {
    availabilityLoading.value = false;
  }
}

async function toggleAvailability(): Promise<void> {
  if (availabilityLoading.value || availabilityUpdating.value || availabilityError.value) {
    return;
  }
  availabilityUpdating.value = true;
  try {
    const next = !acceptingOrders.value;
    const record = await boosterApi.updateAvailability({ acceptingOrders: next });
    acceptingOrders.value = record.acceptingOrders;
    toast.show(next ? '已上线，可以接单' : '已下线，暂停接单');
  } finally {
    availabilityUpdating.value = false;
  }
}

async function accept(order: OrderView): Promise<void> {
  if (!acceptingOrders.value || acceptingOrderId.value) {
    return;
  }
  acceptingOrderId.value = order.id;
  try {
    await orderApi.accept(order.id);
    toast.show('接单成功，请前往订单中心跟进服务');
    await refresh(false);
  } finally {
    acceptingOrderId.value = '';
  }
}

function openDetail(order: OrderView): void {
  router.push({ name: 'hall-order-detail', params: { id: order.id } });
}

function syncPolling(): void {
  poller?.setRunning(document.visibilityState === 'visible');
}

onMounted(() => {
  void loadAvailability();
  void refresh(false);
  poller = createIntervalPoller(() => void refresh(false), AUTO_REFRESH_INTERVAL_MS);
  syncPolling();
  document.addEventListener('visibilitychange', syncPolling);
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', syncPolling);
  poller?.dispose();
  poller = null;
});
</script>

<template>
  <div class="hall">
    <header class="head card">
      <div class="heading">
        <h2 class="title">
          接单大厅
        </h2>
        <span
          v-if="total > 0"
          class="count"
        >{{ total }} 单待接</span>
      </div>

      <button
        type="button"
        class="availability"
        :class="{ 'availability--online': acceptingOrders }"
        role="switch"
        :aria-checked="acceptingOrders"
        :disabled="availabilityLoading || availabilityUpdating || availabilityError"
        @click="toggleAvailability"
      >
        <span class="availability-dot" />
        {{
          availabilityLoading
            ? '加载中'
            : availabilityUpdating
              ? '切换中'
              : availabilityError
                ? '状态异常'
                : availabilityText
        }}
      </button>
    </header>

    <div class="toolbar">
      <button
        type="button"
        class="refresh"
        :disabled="loading"
        @click="refresh(true)"
      >
        <AppIcon
          name="refresh"
          :size="16"
        />
        <span>{{ refreshing ? '刷新中' : '刷新订单' }}</span>
      </button>
    </div>

    <p
      v-if="availabilityError"
      class="error card"
    >
      接单状态加载失败
      <button
        type="button"
        @click="loadAvailability"
      >
        重试
      </button>
    </p>

    <p
      v-if="loadError && orders.length > 0"
      class="error card"
    >
      最新订单加载失败，当前列表已保留
    </p>

    <p
      v-if="loading && orders.length === 0"
      class="hint card"
    >
      订单加载中…
    </p>

    <p
      v-else-if="orders.length === 0"
      class="hint card"
    >
      {{ loadError ? '订单加载失败，请重试' : '暂无待接订单，稍后再来看看吧' }}
    </p>

    <BoosterOrderCard
      v-for="order in orders"
      :key="order.id"
      :order="order"
      :action-label="acceptingOrderId === order.id ? '接单中' : acceptingOrders ? '接单' : '已下线'"
      :action-disabled="!acceptingOrders || Boolean(acceptingOrderId)"
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
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
}

.heading {
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 0;
}

.count {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
}

.availability {
  flex: 0 0 auto;
  min-width: 96px;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 7px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  background: var(--c-surface-2);
  font-size: 12px;
  font-weight: 700;
}

.availability--online {
  color: var(--c-neon);
  border-color: color-mix(in srgb, var(--c-neon) 55%, var(--c-border));
}

.availability:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.availability-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentcolor;
  box-shadow: 0 0 8px currentcolor;
}

.toolbar {
  display: flex;
  justify-content: flex-end;
}

.refresh {
  min-width: 108px;
  min-height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 14px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
  font-size: 13px;
  font-weight: 700;
}

.refresh:disabled {
  cursor: wait;
  opacity: 0.6;
}

.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  color: var(--c-danger);
  font-size: 12px;
}

.error button {
  flex: 0 0 auto;
  color: var(--c-accent);
  font-weight: 700;
}

.hint {
  padding: 32px 16px;
  color: var(--c-text-secondary);
  text-align: center;
  font-size: 13px;
}

.more-wrap {
  display: flex;
  justify-content: center;
}

.more {
  padding: 8px 22px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  color: var(--c-text-secondary);
  font-size: 13px;
}

@media (min-width: 768px) {
  .hall {
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
  }
}

@media (max-width: 420px) {
  .heading {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .toolbar,
  .refresh {
    width: 100%;
  }
}
</style>
