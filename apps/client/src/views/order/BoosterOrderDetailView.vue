<script setup lang="ts">
/**
 * 打手订单详情页（全屏，仅打手）：查看本人接下订单的商品快照、
 * 金额、用户备注与备注附件（图片/视频）、账号信息（接单后可见）；
 * 服务中订单可直接标记完成。
 */
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ORDER_STATUS_TEXT, OrderStatus, type OrderView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import RemarkMediaGallery from '@/components/order/RemarkMediaGallery.vue';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import './OrderDetailView.css';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const order = ref<OrderView | null>(null);
const loading = ref(true);
const completing = ref(false);

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 19).replace('T', ' ') : '-';
}

/** 完成服务中的订单 */
async function complete(): Promise<void> {
  if (!order.value || completing.value) {
    return;
  }
  completing.value = true;
  try {
    order.value = await orderApi.complete(order.value.id);
    toast.show('订单已完成');
  } finally {
    completing.value = false;
  }
}

onMounted(async () => {
  try {
    order.value = await orderApi.boosterDetail(route.params.id as string);
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
              <dt>用户备注</dt>
              <dd>{{ order.remark || '-' }}</dd>
            </div>
            <div class="row">
              <dt>账号信息</dt>
              <dd>{{ order.accountInfo || '-' }}</dd>
            </div>
          </dl>
          <RemarkMediaGallery
            v-if="order.remarkMedia.length"
            class="media"
            :items="order.remarkMedia"
          />
        </section>

        <div
          v-if="order.status === OrderStatus.Serving"
          class="actions"
        >
          <button
            class="complete"
            :disabled="completing"
            @click="complete"
          >
            {{ completing ? '提交中…' : '完成订单' }}
          </button>
        </div>
      </div>

      <p
        v-else-if="!loading"
        class="hint card"
      >
        订单不存在
      </p>
    </div>
  </div>
</template>

<style scoped>
.media {
  margin-top: 12px;
}

.complete {
  width: 100%;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}
</style>
