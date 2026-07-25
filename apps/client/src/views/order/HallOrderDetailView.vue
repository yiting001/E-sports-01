<script setup lang="ts">
/** 接单大厅订单详情：接单前仅展示公开履约信息，账号资料继续由服务端投影隐藏。 */
import {
  BOOSTER_SERVICE_REGIONS,
  ORDER_STATUS_TEXT,
  type OrderView,
} from "@app/contracts";
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { boosterApi } from "@/api/booster.api";
import { orderApi } from "@/api/order.api";
import AppIcon from "@/components/common/AppIcon.vue";
import RemarkMediaGallery from "@/components/order/RemarkMediaGallery.vue";
import { useToast } from "@/composables/use-toast";
import { isHallOrderUnavailableError } from "@/utils/hall-order";
import "./OrderDetailView.css";

const route = useRoute();
const router = useRouter();
const toast = useToast();

const order = ref<OrderView | null>(null);
const loading = ref(true);
const loadError = ref(false);
const unavailable = ref(false);
const accepting = ref(false);
const acceptingOrders = ref(false);
const availabilityLoading = ref(true);
const availabilityError = ref(false);

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 19).replace("T", " ") : "-";
}

function serviceRegionText(value: OrderView["serviceRegion"]): string {
  return (
    BOOSTER_SERVICE_REGIONS.find((item) => item.value === value)?.label ??
    "待确认"
  );
}

async function loadOrder(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  unavailable.value = false;
  try {
    order.value = await orderApi.hallDetail(route.params.id as string, {
      silent: true,
    });
  } catch (error: unknown) {
    order.value = null;
    if (isHallOrderUnavailableError(error)) {
      unavailable.value = true;
    } else {
      loadError.value = true;
    }
  } finally {
    loading.value = false;
  }
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

async function accept(): Promise<void> {
  if (!order.value || accepting.value || !acceptingOrders.value) {
    return;
  }
  accepting.value = true;
  try {
    const accepted = await orderApi.accept(order.value.id);
    toast.show("接单成功，已进入履约订单");
    await router.replace({
      name: "booster-order-detail",
      params: { id: accepted.id },
    });
  } catch (error: unknown) {
    if (isHallOrderUnavailableError(error)) {
      order.value = null;
      unavailable.value = true;
      loadError.value = false;
    }
  } finally {
    accepting.value = false;
  }
}

function returnHall(): void {
  void router.replace({ name: "hall" });
}

onMounted(() => {
  void loadAvailability();
  void loadOrder();
});
</script>

<template>
  <div class="order-detail client-page">
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
        <span class="name">待接订单详情</span>
      </div>
    </header>

    <div class="scroll">
      <div
        v-if="loading"
        class="state card"
      >
        <p>订单加载中...</p>
      </div>

      <div
        v-else-if="loadError"
        class="state state--error card"
      >
        <p>订单详情加载失败</p>
        <button
          type="button"
          @click="loadOrder"
        >
          重新加载
        </button>
      </div>

      <div
        v-else-if="unavailable"
        class="state card"
      >
        <p>订单不存在或已被其他打手接走</p>
        <button
          type="button"
          @click="returnHall"
        >
          返回接单大厅
        </button>
      </div>

      <div
        v-else-if="order"
        class="content"
      >
        <section class="card block">
          <div class="head">
            <span
              class="thumb"
              :class="{ 'thumb--image': order.productCover }"
              :style="
                order.productCover
                  ? { backgroundImage: `url(${order.productCover})` }
                  : undefined
              "
            >
              <AppIcon
                v-if="!order.productCover"
                name="gem"
                :size="26"
              />
            </span>
            <div class="head-mid">
              <p class="title">
                {{ order.productTitle }}
              </p>
              <p class="sub">
                数量 ×{{ order.quantity }}
              </p>
            </div>
            <span class="status">{{ ORDER_STATUS_TEXT[order.status] }}</span>
          </div>
        </section>

        <section class="card block">
          <h3 class="block-title">
            服务信息
          </h3>
          <dl class="rows">
            <div class="row">
              <dt>游戏区服</dt>
              <dd class="region-text">
                {{ serviceRegionText(order.serviceRegion) }}
              </dd>
            </div>
            <div class="row">
              <dt>订单金额</dt>
              <dd class="total">
                ¥{{ order.amountYuan }}
              </dd>
            </div>
            <div class="row">
              <dt>下发时间</dt>
              <dd>{{ formatTime(order.dispatchedAt) }}</dd>
            </div>
            <div class="row">
              <dt>下单时间</dt>
              <dd>{{ formatTime(order.createdAt) }}</dd>
            </div>
          </dl>
        </section>

        <section class="card block">
          <h3 class="block-title">
            订单要求
          </h3>
          <dl class="rows">
            <div class="row">
              <dt>订单号</dt>
              <dd class="mono">
                {{ order.orderNo }}
              </dd>
            </div>
            <div class="row row--remark">
              <dt>用户备注</dt>
              <dd>{{ order.remark || "无" }}</dd>
            </div>
          </dl>
          <RemarkMediaGallery
            v-if="order.remarkMedia.length"
            class="media"
            :items="order.remarkMedia"
          />
        </section>

        <div
          v-if="availabilityError"
          class="availability-warning card"
        >
          <span>接单状态加载失败</span>
          <button
            type="button"
            @click="loadAvailability"
          >
            重试
          </button>
        </div>

        <div class="actions actions--hall">
          <button
            type="button"
            class="secondary"
            @click="returnHall"
          >
            返回大厅
          </button>
          <button
            type="button"
            class="accept"
            :disabled="
              accepting ||
                availabilityLoading ||
                availabilityError ||
                !acceptingOrders
            "
            @click="accept"
          >
            {{
              accepting
                ? "接单中..."
                : availabilityLoading
                  ? "状态加载中"
                  : availabilityError
                    ? "状态加载失败"
                    : acceptingOrders
                      ? "立即接单"
                      : "上线后可接单"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.state {
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  padding: 34px 18px;
  color: var(--c-text-secondary);
  text-align: center;
  font-size: 13px;
}

.state--error {
  color: var(--c-danger);
}

.state button,
.availability-warning button {
  margin-top: 12px;
  padding: 8px 18px;
  color: var(--c-accent);
  border: 1px solid var(--c-accent);
  border-radius: var(--radius-sm);
  font-weight: 700;
}

.region-text {
  color: var(--c-neon);
  font-weight: 700;
}

.row--remark {
  align-items: flex-start;
}

.row--remark dd {
  max-width: min(72%, 480px);
  line-height: 1.6;
  white-space: pre-wrap;
}

.availability-warning {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  color: var(--c-danger);
  font-size: 12px;
}

.availability-warning button {
  flex: 0 0 auto;
  margin-top: 0;
}

.actions--hall {
  display: grid;
  grid-template-columns: minmax(96px, 0.35fr) minmax(0, 1fr);
  gap: 10px;
}

.secondary,
.accept {
  min-height: 44px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 700;
}

.secondary {
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  background: var(--c-surface);
}

.accept {
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(
    10px 0,
    100% 0,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    0 100%,
    0 10px
  );
}

.accept:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
