<script setup lang="ts">
/** 订单详情中的退款申请入口与审核/渠道进度。 */
import { computed } from "vue";
import {
  ORDER_PAYMENT_METHOD_TEXT,
  ORDER_REFUND_STATUS_TEXT,
  type OrderView,
} from "@app/contracts";
import { orderRefundStatusTone } from "@/utils/order-status";

const props = defineProps<{
  order: OrderView;
  formatTime: (value: string) => string;
}>();

const emit = defineEmits<{ request: [] }>();

const refundTone = computed(() =>
  props.order.refund
    ? orderRefundStatusTone(props.order.refund.status)
    : "muted"
);
</script>

<template>
  <section
    v-if="order.refund || order.canRequestRefund"
    class="card refund-panel"
  >
    <header class="refund-head">
      <h3>退款信息</h3>
      <span
        v-if="order.refund"
        :class="['refund-status', `refund-status--${refundTone}`]"
      >
        {{ ORDER_REFUND_STATUS_TEXT[order.refund.status] }}
      </span>
    </header>

    <dl
      v-if="order.refund"
      class="refund-rows"
    >
      <div>
        <dt>退款金额</dt>
        <dd>¥{{ order.refund.amountYuan }}</dd>
      </div>
      <div>
        <dt>退款方式</dt>
        <dd>{{ ORDER_PAYMENT_METHOD_TEXT[order.refund.paymentMethod] }}</dd>
      </div>
      <div>
        <dt>申请时间</dt>
        <dd>{{ formatTime(order.refund.requestedAt) }}</dd>
      </div>
      <div class="refund-row--stack">
        <dt>退款原因</dt>
        <dd>{{ order.refund.reason }}</dd>
      </div>
      <div
        v-if="order.refund.rejectReason"
        class="refund-row--stack refund-row--danger"
      >
        <dt>驳回原因</dt>
        <dd>{{ order.refund.rejectReason }}</dd>
      </div>
      <div
        v-if="order.refund.failReason"
        class="refund-row--stack refund-row--danger"
      >
        <dt>失败原因</dt>
        <dd>{{ order.refund.failReason }}</dd>
      </div>
      <div v-if="order.refund.reviewedAt">
        <dt>审核时间</dt>
        <dd>{{ formatTime(order.refund.reviewedAt) }}</dd>
      </div>
      <div v-if="order.refund.refundedAt">
        <dt>到账时间</dt>
        <dd>{{ formatTime(order.refund.refundedAt) }}</dd>
      </div>
    </dl>

    <p
      v-else
      class="refund-available"
    >
      当前订单可申请全额原路退款。
    </p>

    <button
      v-if="order.canRequestRefund"
      type="button"
      class="refund-request"
      @click="emit('request')"
    >
      {{ order.refund ? "重新申请退款" : "申请退款" }}
    </button>
  </section>
</template>

<style scoped>
.refund-panel {
  padding: 14px 16px;
}

.refund-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.refund-head h3 {
  font-size: 13px;
  font-weight: 700;
  color: var(--c-text-secondary);
}

.refund-status {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 700;
  border: 1px solid currentcolor;
  border-radius: 999px;
}

.refund-status--accent {
  color: var(--c-accent);
}

.refund-status--success {
  color: var(--c-neon);
}

.refund-status--danger {
  color: var(--c-danger, #ff5a5a);
}

.refund-rows {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.refund-rows > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.refund-rows dt {
  flex-shrink: 0;
  color: var(--c-text-secondary);
}

.refund-rows dd {
  text-align: right;
  word-break: break-word;
}

.refund-row--stack {
  flex-direction: column;
  gap: 4px !important;
}

.refund-row--stack dd {
  text-align: left;
  line-height: 1.6;
}

.refund-row--danger dd {
  color: var(--c-danger, #ff5a5a);
}

.refund-available {
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.refund-request {
  width: 100%;
  min-height: 38px;
  margin-top: 12px;
  font-size: 13px;
  font-weight: 800;
  color: var(--c-bg);
  border-radius: var(--radius-sm);
  background: var(--c-accent);
}
</style>
