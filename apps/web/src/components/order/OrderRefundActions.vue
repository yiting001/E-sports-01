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
  /** 强制退款（管理员对已完成订单直接退款） */
  adminRefund: [order: AdminOrderView];
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

/** 是否显示强制退款按钮：已完成订单且无退款记录时 */
const showAdminRefund = computed(() => {
  const order = props.order;
  return (
    order.status === "completed" &&
    !order.refund &&
    props.order.refund?.status !== "pending_review"
  );
});
</script>

<template>
  <span class="refund-actions">
    <template v-if="order.refund && primary">
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
    </template>
    <el-button
      v-if="showAdminRefund"
      v-permission="PERMS.order.refundReview"
      link
      type="warning"
      :icon="RefreshRight"
      :loading="(submittingAction as string) === 'adminRefund'"
      :disabled="Boolean(submittingAction)"
      @click="emit('adminRefund', order)"
    >
      强制退款
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
