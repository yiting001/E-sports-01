<script setup lang="ts">
/** 订单退款审核按钮：复用同一权限和状态到列表、详情抽屉。 */
import { computed } from "vue";
import { OrderRefundStatus, PERMS, type AdminOrderView } from "@app/contracts";
import { Check, Close, RefreshRight, Search } from "@element-plus/icons-vue";
import {
  refundPrimaryAction,
  type RefundSubmissionAction,
} from "@/utils/order-refund-ui";

const props = defineProps<{
  order: AdminOrderView;
  submittingAction?: RefundSubmissionAction;
}>();

const emit = defineEmits<{
  advance: [order: AdminOrderView];
  reject: [order: AdminOrderView];
}>();

const primary = computed(() =>
  props.order.refund ? refundPrimaryAction(props.order.refund.status) : null
);

const primaryIcon = computed(() => {
  switch (primary.value?.action) {
    case "approve":
      return Check;
    case "query":
      return Search;
    case "retry":
      return RefreshRight;
    default:
      return Check;
  }
});
</script>

<template>
  <span
    v-if="order.refund && primary"
    class="refund-actions"
  >
    <el-button
      v-permission="PERMS.order.refundReview"
      link
      type="success"
      :icon="primaryIcon"
      :loading="submittingAction === 'advance'"
      :disabled="Boolean(submittingAction)"
      @click="emit('advance', order)"
    >
      {{ primary.label }}
    </el-button>
    <el-button
      v-if="order.refund.status === OrderRefundStatus.PendingReview"
      v-permission="PERMS.order.refundReview"
      link
      type="danger"
      :icon="Close"
      :loading="submittingAction === 'reject'"
      :disabled="Boolean(submittingAction)"
      @click="emit('reject', order)"
    >
      驳回
    </el-button>
  </span>
</template>

<style scoped>
.refund-actions {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
</style>
