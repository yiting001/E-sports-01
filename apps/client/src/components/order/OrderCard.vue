<script setup lang="ts">
/**
 * 订单列表卡片：展示订单号、商品快照、金额、状态与当前状态可用操作，
 * 点击卡片主体进入订单详情。
 * 父页面只负责数据加载和弹窗编排，卡片内部负责单条订单的展示规则。
 */
import {
  ORDER_REFUND_STATUS_TEXT,
  ORDER_STATUS_TEXT,
  OrderStatus,
  type OrderView,
} from "@app/contracts";
import AppIcon from "@/components/common/AppIcon.vue";
import { orderRefundStatusTone, orderStatusTone } from "@/utils/order-status";

defineProps<{
  order: OrderView;
  reviewed: boolean;
}>();

const emit = defineEmits<{
  open: [order: OrderView];
  cancel: [order: OrderView];
  review: [order: OrderView];
}>();

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 16).replace("T", " ") : "";
}
</script>

<template>
  <article
    class="order card"
    @click="emit('open', order)"
  >
    <div class="head">
      <span class="no">订单号 {{ order.orderNo }}</span>
      <span class="tags">
        <span
          class="tag"
          :class="`tag--${orderStatusTone(order.status)}`"
        >
          {{ ORDER_STATUS_TEXT[order.status] }}
        </span>
        <span
          v-if="order.refund"
          class="tag tag--refund"
          :class="`tag--${orderRefundStatusTone(order.refund.status)}`"
        >
          退款：{{ ORDER_REFUND_STATUS_TEXT[order.refund.status] }}
        </span>
      </span>
    </div>

    <div class="body">
      <div
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
        @click.stop="emit('cancel', order)"
      >
        取消订单
      </button>
    </div>
    <div
      v-else-if="order.status === OrderStatus.Completed"
      class="actions"
    >
      <span
        v-if="reviewed"
        class="reviewed"
      >已评价</span>
      <button
        v-else
        class="review"
        @click.stop="emit('review', order)"
      >
        评价
      </button>
    </div>
  </article>
</template>

<style scoped>
.order {
  padding: 12px 14px;
  cursor: pointer;
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
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1px solid currentcolor;
}

.tags {
  flex-shrink: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 5px;
}

.tag--accent {
  color: var(--c-accent);
}

.tag--success {
  color: var(--c-neon);
}

.tag--muted {
  color: var(--c-text-muted);
}

.tag--danger {
  color: var(--c-danger, #ff5a5a);
}

.tag--refund {
  font-size: 10px;
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
  flex-shrink: 0;
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

@media (min-width: 768px) {
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
    line-height: 1.45;
    white-space: normal;
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
  .review {
    padding: 8px 18px;
    font-size: 13px;
  }
}
</style>
