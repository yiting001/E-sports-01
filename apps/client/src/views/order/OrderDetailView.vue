<script setup lang="ts">
/**
 * 订单详情页（全屏）：展示单笔订单的商品快照、状态、价格明细
 * （原价/会员折扣/优惠券抵扣/实付）、订单信息与时间线；
 * 已建群订单提供「进入订单群」入口，待付款订单可取消。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  FEE_RATE_BASE,
  ORDER_STATUS_TEXT,
  OrderStatus,
  PAYMENT_PROVIDER_TEXT,
  fenToYuan,
  type OrderView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { orderApi } from '@/api/order.api';
import { useToast } from '@/composables/use-toast';
import './OrderDetailView.css';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const order = ref<OrderView | null>(null);
const loading = ref(true);

/** 会员折扣减免金额（分）= 原价 - 券抵扣 - 实付 */
const memberDiscountFen = computed(() => {
  if (!order.value) {
    return 0;
  }
  return (
    order.value.originalAmountFen -
    order.value.couponDeductionFen -
    order.value.amountFen
  );
});

/** 会员折扣文案：万分比 → 几折（如 9500 → 95 折） */
const discountText = computed(() => {
  if (!order.value) {
    return '';
  }
  return `${(order.value.discountBp / (FEE_RATE_BASE / 100)).toFixed(0)} 折`;
});

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 19).replace('T', ' ') : '-';
}

/** 进入订单群（支付成功后自动创建，成员含客服/管理员，打手接单后进群） */
function enterGroup(): void {
  if (order.value?.conversationId) {
    router.push({ name: 'chat', params: { id: order.value.conversationId } });
  }
}

async function cancel(): Promise<void> {
  if (!order.value) {
    return;
  }
  order.value = await orderApi.cancel(order.value.id);
  toast.show('订单已取消');
}

onMounted(async () => {
  try {
    order.value = await orderApi.detail(route.params.id as string);
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

        <!-- 订单群入口 -->
        <section
          v-if="order.conversationId"
          class="card block"
        >
          <button
            class="group-entry"
            @click="enterGroup"
          >
            <span class="group-icon">
              <AppIcon
                name="chat"
                :size="20"
              />
            </span>
            <span class="group-text">
              <span class="group-title">订单沟通群</span>
              <span class="group-sub">与客服、打手在群内沟通服务细节</span>
            </span>
            <AppIcon
              name="chevron"
              :size="16"
              class="group-arrow"
            />
          </button>
        </section>

        <!-- 价格明细 -->
        <section class="card block">
          <h3 class="block-title">
            价格明细
          </h3>
          <dl class="rows">
            <div class="row">
              <dt>商品原价</dt>
              <dd>¥{{ fenToYuan(order.originalAmountFen) }}</dd>
            </div>
            <div
              v-if="order.discountBp < FEE_RATE_BASE"
              class="row"
            >
              <dt>会员折扣（{{ discountText }}）</dt>
              <dd class="minus">
                -¥{{ fenToYuan(memberDiscountFen) }}
              </dd>
            </div>
            <div class="row">
              <dt>优惠券抵扣</dt>
              <dd
                v-if="order.couponDeductionFen > 0"
                class="minus"
              >
                -¥{{ fenToYuan(order.couponDeductionFen) }}
              </dd>
              <dd v-else>
                未用券
              </dd>
            </div>
            <div class="row row--total">
              <dt>实付金额</dt>
              <dd class="total">
                ¥{{ order.amountYuan }}
              </dd>
            </div>
          </dl>
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
              <dt>支付方式</dt>
              <dd>{{ PAYMENT_PROVIDER_TEXT[order.provider] }}</dd>
            </div>
            <div class="row">
              <dt>下单时间</dt>
              <dd>{{ formatTime(order.createdAt) }}</dd>
            </div>
            <div class="row">
              <dt>支付时间</dt>
              <dd>{{ formatTime(order.paidAt) }}</dd>
            </div>
            <div
              v-if="order.remark"
              class="row"
            >
              <dt>备注</dt>
              <dd>{{ order.remark }}</dd>
            </div>
          </dl>
        </section>

        <div
          v-if="order.status === OrderStatus.PendingPayment"
          class="actions"
        >
          <button
            class="cancel"
            @click="cancel"
          >
            取消订单
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
