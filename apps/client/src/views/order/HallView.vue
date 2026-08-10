<script setup lang="ts">
/** 接单大厅：按订单或区服筛选待接订单，并保留打手上下线与原子接单门禁。 */
import {
  BOOSTER_SERVICE_REGION,
  type BoosterServiceRegion,
  type OrderView,
} from "@app/contracts";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { boosterApi } from "@/api/booster.api";
import { orderApi, type HallOrderFilter } from "@/api/order.api";
import AppIcon from "@/components/common/AppIcon.vue";
import BoosterOrderCard from "@/components/order/BoosterOrderCard.vue";
import { useToast } from "@/composables/use-toast";
import { useHallBadgeStore } from "@/stores/hall-badge.store";
import {
  createIntervalPoller,
  type IntervalPoller,
} from "@/utils/interval-poller";
import { alignHallRefreshPageSize } from "@/utils/hall-order";

const PAGE_SIZE = 10;
const MAX_REFRESH_PAGE_SIZE = 100;
const AUTO_REFRESH_INTERVAL_MS = 5_000;
const KEYWORD_MAX_LENGTH = 64;

type RegionFilter = BoosterServiceRegion | "";

const REGION_FILTERS: ReadonlyArray<{ label: string; value: RegionFilter }> = [
  { label: "全部", value: "" },
  { label: "手机端", value: BOOSTER_SERVICE_REGION.Mobile },
  { label: "电脑端", value: BOOSTER_SERVICE_REGION.Pc },
];

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
const keywordDraft = ref("");
const keyword = ref("");
const serviceRegion = ref<RegionFilter>("");
const acceptingOrderId = ref("");
const acceptingOrders = ref(false);
const boosterRateBp = ref(0);
const availabilityLoading = ref(true);
const availabilityError = ref(false);
const availabilityUpdating = ref(false);
let requestSequence = 0;
let poller: IntervalPoller | null = null;

const availabilityText = computed(() =>
  acceptingOrders.value ? "上线接单" : "已下线"
);
const activeQuery = computed<HallOrderFilter>(() => ({
  keyword: keyword.value || undefined,
  serviceRegion: serviceRegion.value || undefined,
}));
const hasActiveFilters = computed(() =>
  Boolean(activeQuery.value.keyword || activeQuery.value.serviceRegion)
);

async function requestPage(
  targetPage: number,
  targetPageSize: number,
  replace: boolean,
  manual: boolean,
  force = false
): Promise<boolean> {
  if (loading.value && !force) {
    return false;
  }
  const requestId = ++requestSequence;
  const query = { ...activeQuery.value };
  loading.value = true;
  try {
    const result = await orderApi.hall(targetPage, targetPageSize, query, {
      silent: true,
    });
    if (requestId !== requestSequence) {
      return false;
    }
    orders.value = replace ? result.list : [...orders.value, ...result.list];
    total.value = result.total;
    if (!query.keyword && !query.serviceRegion) {
      hallBadge.setTotal(result.total);
    }
    page.value = replace
      ? Math.max(1, Math.ceil(result.list.length / PAGE_SIZE))
      : targetPage;
    loadError.value = false;
    hasLoaded.value = true;
    return true;
  } catch {
    if (requestId !== requestSequence) {
      return false;
    }
    loadError.value = true;
    if (manual) {
      toast.show("订单刷新失败，请重试");
    }
    return false;
  } finally {
    if (requestId === requestSequence) {
      loading.value = false;
    }
  }
}

/** 刷新已加载范围，避免轮询把已展开的分页折回第一页。 */
async function refresh(manual: boolean, force = false): Promise<void> {
  if (manual) {
    refreshing.value = true;
  }
  try {
    const visiblePageSize = alignHallRefreshPageSize(
      orders.value.length,
      PAGE_SIZE,
      MAX_REFRESH_PAGE_SIZE
    );
    const success = await requestPage(1, visiblePageSize, true, manual, force);
    if (manual && success) {
      toast.show("订单已刷新");
    }
  } finally {
    if (manual) {
      refreshing.value = false;
    }
  }
}

function reloadForFilters(): void {
  orders.value = [];
  total.value = 0;
  page.value = 1;
  loadError.value = false;
  hasLoaded.value = false;
  void requestPage(1, PAGE_SIZE, true, false, true);
}

function submitSearch(): void {
  const normalized = keywordDraft.value.trim();
  keywordDraft.value = normalized;
  if (normalized === keyword.value) {
    void refresh(true);
    return;
  }
  keyword.value = normalized;
  reloadForFilters();
}

function clearSearch(): void {
  keywordDraft.value = "";
  if (!keyword.value) {
    return;
  }
  keyword.value = "";
  reloadForFilters();
}

function selectRegion(value: RegionFilter): void {
  if (serviceRegion.value === value) {
    return;
  }
  serviceRegion.value = value;
  reloadForFilters();
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
    boosterRateBp.value = mine.record.commissionRateBp;
  } catch {
    availabilityError.value = true;
  } finally {
    availabilityLoading.value = false;
  }
}

async function toggleAvailability(): Promise<void> {
  if (
    availabilityLoading.value ||
    availabilityUpdating.value ||
    availabilityError.value
  ) {
    return;
  }
  availabilityUpdating.value = true;
  try {
    const next = !acceptingOrders.value;
    const record = await boosterApi.updateAvailability({
      acceptingOrders: next,
    });
    acceptingOrders.value = record.acceptingOrders;
    toast.show(next ? "已上线，可以接单" : "已下线，暂停接单");
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
    toast.show("接单成功，请前往订单中心跟进服务");
    await refresh(false);
  } finally {
    acceptingOrderId.value = "";
  }
}

function openDetail(order: OrderView): void {
  void router.push({ name: "hall-order-detail", params: { id: order.id } });
}

function syncPolling(): void {
  poller?.setRunning(document.visibilityState === "visible");
}

onMounted(() => {
  void loadAvailability();
  void refresh(false);
  poller = createIntervalPoller(
    () => void refresh(false),
    AUTO_REFRESH_INTERVAL_MS
  );
  syncPolling();
  document.addEventListener("visibilitychange", syncPolling);
});

onBeforeUnmount(() => {
  requestSequence += 1;
  document.removeEventListener("visibilitychange", syncPolling);
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
          v-if="hasLoaded"
          class="count"
        >{{ total }} 单待接</span>
      </div>

      <button
        type="button"
        class="availability"
        :class="{ 'availability--online': acceptingOrders }"
        role="switch"
        :aria-checked="acceptingOrders"
        :disabled="
          availabilityLoading || availabilityUpdating || availabilityError
        "
        @click="toggleAvailability"
      >
        <span class="availability-dot" />
        {{
          availabilityLoading
            ? "加载中"
            : availabilityUpdating
              ? "切换中"
              : availabilityError
                ? "状态异常"
                : availabilityText
        }}
      </button>
    </header>

    <form
      class="search"
      role="search"
      @submit.prevent="submitSearch"
    >
      <AppIcon
        name="search"
        :size="17"
      />
      <input
        v-model="keywordDraft"
        type="search"
        :maxlength="KEYWORD_MAX_LENGTH"
        autocomplete="off"
        placeholder="搜索订单号或商品名"
        aria-label="搜索订单号或商品名"
      >
      <button
        v-if="keywordDraft"
        type="button"
        class="search-clear"
        aria-label="清空搜索"
        title="清空搜索"
        @click="clearSearch"
      >
        <AppIcon
          name="close"
          :size="16"
        />
      </button>
      <button
        type="submit"
        class="search-submit"
      >
        搜索
      </button>
    </form>

    <div class="filter-toolbar">
      <div
        class="segments"
        aria-label="服务区服"
      >
        <button
          v-for="filter in REGION_FILTERS"
          :key="filter.value || 'all'"
          type="button"
          :class="{ active: serviceRegion === filter.value }"
          :aria-pressed="serviceRegion === filter.value"
          @click="selectRegion(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>

      <button
        type="button"
        class="refresh"
        :disabled="loading"
        title="刷新订单"
        @click="refresh(true)"
      >
        <AppIcon
          name="refresh"
          :size="16"
        />
        <span>{{ refreshing ? "刷新中" : "刷新" }}</span>
      </button>
    </div>

    <p
      v-if="availabilityError"
      class="error card"
    >
      <span>接单状态加载失败</span>
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
      <span>最新订单加载失败，当前列表已保留</span>
      <button
        type="button"
        @click="refresh(true)"
      >
        重试
      </button>
    </p>

    <p
      v-if="loading && orders.length === 0"
      class="hint card"
    >
      订单加载中...
    </p>

    <div
      v-else-if="orders.length === 0"
      class="hint card"
    >
      <p>
        {{
          loadError
            ? "订单加载失败"
            : hasActiveFilters
              ? "没有匹配的待接订单"
              : "暂无待接订单"
        }}
      </p>
      <button
        v-if="loadError"
        type="button"
        @click="refresh(true)"
      >
        重新加载
      </button>
    </div>

    <BoosterOrderCard
      v-for="order in orders"
      :key="order.id"
      :order="order"
      :action-label="
        acceptingOrderId === order.id
          ? '接单中'
          : acceptingOrders
            ? '立即接单'
            : '已下线'
      "
      :action-disabled="!acceptingOrders || Boolean(acceptingOrderId)"
      :fallback-rate-bp="boosterRateBp"
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
        {{ loading ? "加载中..." : "加载更多" }}
      </button>
    </div>
  </div>
</template>

<style scoped src="./HallView.css"></style>
