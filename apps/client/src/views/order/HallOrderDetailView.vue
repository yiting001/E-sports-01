<script setup lang="ts">
/**
 * 接单大厅订单详情页（全屏，仅打手）：展示待接单订单的商品快照、
 * 数量、金额、备注与备注附件（图片/视频），底部可直接接单；
 * 账号信息在接单前后端不下发、不展示。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  BOOSTER_SERVICE_REGIONS,
  ORDER_STATUS_TEXT,
  type OrderView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import RemarkMediaGallery from '@/components/order/RemarkMediaGallery.vue';
import { boosterApi } from '@/api/booster.api';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import './OrderDetailView.css';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const order = ref<OrderView | null>(null);
const loading = ref(true);
const accepting = ref(false);
const acceptingOrders = ref(false);
const availabilityLoading = ref(true);
const availabilityError = ref(false);

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 19).replace('T', ' ') : '-';
}

/** 区服值 → 展示文案；历史订单为空串时展示占位 */
function regionLabel(value: string): string {
  return BOOSTER_SERVICE_REGIONS.find((item) => item.value === value)?.label ?? '-';
}

/** 接单：成功后提示并返回大厅 */
async function accept(): Promise<void> {
  if (!order.value || accepting.value || !acceptingOrders.value) {
    return;
  }
  accepting.value = true;
  try {
    await orderApi.accept(order.value.id);
    toast.show('接单成功，请前往订单中心跟进服务');
    router.back();
  } finally {
    accepting.value = false;
  }
}

async function loadAvailability(): Promise<void> {
  try {
    const mine = await boosterApi.mine();
    acceptingOrders.value = mine.record?.acceptingOrders ?? false;
  } catch {
    availabilityError.value = true;
  } finally {
    availabilityLoading.value = false;
  }
}

onMounted(async () => {
  void loadAvailability();
  try {
    order.value = await orderApi.hallDetail(route.params.id as string);
  } finally {
    loading.value = false;
  }
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
        <span class="name">订单详情</span>
      </div>
    </header>

    <div class="scroll">
      <div
        v-if="order"
        class="content"
      >
        <!-- 商品快照 + 状态 -->
        <section class="card block">
          <div class="head">
            <span
              class="thumb"
              :class="{ 'thumb--image': order.productCover }"
              :style="order.productCover ? { backgroundImage: `url(${order.productCover})` } : undefined"
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

        <!-- 订单信息 -->
        <section class="card block">
          <h3 class="block-title">
            订单信息
          </h3>
          <dl class="rows">
            <div class="row">
              <dt>订单号</dt>
              <dd class="mono">
                {{ order.orderNo }}
              </dd>
            </div>
            <div class="row">
              <dt>订单金额</dt>
              <dd>¥{{ order.amountYuan }}</dd>
            </div>
            <div class="row">
              <dt>下单时间</dt>
              <dd>{{ formatTime(order.createdAt) }}</dd>
            </div>
            <div class="row">
              <dt>游戏区服</dt>
              <dd>{{ regionLabel(order.serviceRegion) }}</dd>
            </div>
            <div class="row">
              <dt>游戏ID</dt>
              <dd>接单后可查看</dd>
            </div>
            <div class="row">
              <dt>用户备注</dt>
              <dd>{{ order.remark || '-' }}</dd>
            </div>
          </dl>
          <RemarkMediaGallery
            v-if="order.remarkMedia.length"
            class="media"
            :items="order.remarkMedia"
          />
        </section>

        <div class="actions">
          <button
            class="accept"
            :disabled="accepting || availabilityLoading || !acceptingOrders"
            @click="accept"
          >
            {{
              accepting
                ? '接单中…'
                : availabilityError
                  ? '状态加载失败'
                  : acceptingOrders
                    ? '接单'
                    : '当前已下线'
            }}
          </button>
        </div>
      </div>

      <p
        v-else-if="!loading"
        class="hint card"
      >
        订单不存在或已被接走
      </p>
    </div>
  </div>
</template>

<style scoped>
.media {
  margin-top: 12px;
}

.accept {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.accept:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
