<script setup lang="ts">
/**
 * 订单详情抽屉：展示单笔订单的完整字段
 * （商品快照/价格明细/归属用户/关联客服/支付渠道交易号/备注/时间线），
 * 已建群订单提供进入订单群入口。
 */
import {
  BOOSTER_SERVICE_REGIONS,
  FEE_RATE_BASE,
  ORDER_PAYMENT_METHOD_TEXT,
  ORDER_REFUND_STATUS_TEXT,
  ORDER_STATUS_TEXT,
  OrderBoosterSelectionMode,
  PERMS,
  fenToYuan,
  type AdminOrderView,
  type OrderStatus,
  type OrderPaymentMethod,
} from "@app/contracts";
import { computed } from "vue";
import OrderRefundActions from "@/components/order/OrderRefundActions.vue";
import { useAuthStore } from "@/stores/auth.store";
import {
  canShowRefundReviewAction,
  refundTagType,
  type RefundSubmissionAction,
} from "@/utils/order-refund-ui";

function serviceRegionText(value: AdminOrderView["serviceRegion"]): string {
  if (!value) {
    return "-";
  }
  return (
    BOOSTER_SERVICE_REGIONS.find((item) => item.value === value)?.label ?? value
  );
}

function boosterText(name: string, id: string, emptyText: string): string {
  if (!id) {
    return emptyText;
  }
  return name ? `${name}（ID：${id}）` : `ID：${id}`;
}

function selectionModeText(mode: OrderBoosterSelectionMode): string {
  return mode === OrderBoosterSelectionMode.Specified
    ? "老板指定打手"
    : "平台自动安排";
}

/** 会员折扣减免金额（分）= 原价 - 券抵扣 - 实付 */
function memberDiscountFen(order: AdminOrderView): number {
  return order.originalAmountFen - order.couponDeductionFen - order.amountFen;
}

/** 会员折扣文案：万分比 → 几折（如 9500 → 95 折） */
function discountText(discountBp: number): string {
  return `${(discountBp / (FEE_RATE_BASE / 100)).toFixed(0)} 折`;
}

const props = defineProps<{
  /** 当前查看的订单，为空时不渲染内容 */
  order: AdminOrderView | null;
  /** 时间格式化函数（与列表页共用） */
  formatDate: (value: string) => string;
  /** 当前退款审核请求，用于禁用重复操作 */
  refundSubmittingAction?: RefundSubmissionAction;
}>();

const auth = useAuthStore();
const canShowRefundActions = computed(() => {
  const refund = props.order?.refund;
  return refund
    ? canShowRefundReviewAction(
        refund.status,
        auth.hasPermission(PERMS.order.refundReview)
      )
    : false;
});

const emit = defineEmits<{
  /** 点击商品 → 由父页弹窗预览商品详情 */
  "view-product": [productId: string];
  /** 点击进入订单群 → 由父页加群并跳转 IM */
  "enter-group": [order: AdminOrderView];
  /** 同意、查询或重试退款 */
  "advance-refund": [order: AdminOrderView];
  /** 驳回待审核退款 */
  "reject-refund": [order: AdminOrderView];
}>();

const visible = defineModel<boolean>({ required: true });
</script>

<template>
  <el-drawer
    v-model="visible"
    title="订单详情"
    size="420px"
  >
    <el-descriptions
      v-if="order"
      :column="1"
      border
    >
      <el-descriptions-item label="订单号">
        {{ order.orderNo }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        {{ ORDER_STATUS_TEXT[order.status as OrderStatus] }}
      </el-descriptions-item>
      <template v-if="order.refund">
        <el-descriptions-item label="退款状态">
          <el-tag :type="refundTagType(order.refund.status)">
            {{ ORDER_REFUND_STATUS_TEXT[order.refund.status] }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="退款单号">
          {{ order.refund.refundNo }}
        </el-descriptions-item>
        <el-descriptions-item label="退款金额">
          ¥{{ order.refund.amountYuan }}（{{
            ORDER_PAYMENT_METHOD_TEXT[order.refund.paymentMethod]
          }}）
        </el-descriptions-item>
        <el-descriptions-item label="申请原因">
          <span class="refund-content">{{ order.refund.reason }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatDate(order.refund.requestedAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="order.refund.rejectReason"
          label="驳回原因"
        >
          <span class="refund-content refund-content--danger">
            {{ order.refund.rejectReason }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="order.refund.failReason"
          label="失败原因"
        >
          <span class="refund-content refund-content--danger">
            {{ order.refund.failReason }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item
          v-if="order.refund.reviewerId"
          label="审核人"
        >
          {{ order.refund.reviewerId }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="order.refund.reviewedAt"
          label="审核时间"
        >
          {{ formatDate(order.refund.reviewedAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="order.refund.refundedAt"
          label="退款完成时间"
        >
          {{ formatDate(order.refund.refundedAt) }}
        </el-descriptions-item>
        <el-descriptions-item
          v-if="canShowRefundActions"
          label="退款操作"
        >
          <OrderRefundActions
            :order="order"
            :submitting-action="refundSubmittingAction"
            @advance="emit('advance-refund', $event)"
            @reject="emit('reject-refund', $event)"
          />
        </el-descriptions-item>
      </template>
      <el-descriptions-item label="商品">
        <el-button
          link
          type="primary"
          @click="emit('view-product', order.productId)"
        >
          {{ order.productTitle }}
        </el-button>
      </el-descriptions-item>
      <el-descriptions-item label="数量">
        {{ order.quantity }}
      </el-descriptions-item>
      <el-descriptions-item label="游戏账号 ID">
        {{ order.gameAccountId || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="游戏文字 ID">
        {{ order.gameTextId || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="游戏区服">
        {{ serviceRegionText(order.serviceRegion) }}
      </el-descriptions-item>
      <el-descriptions-item label="打手安排方式">
        <el-tag
          :type="
            order.boosterSelectionMode === OrderBoosterSelectionMode.Specified
              ? 'warning'
              : 'info'
          "
        >
          {{ selectionModeText(order.boosterSelectionMode) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="老板指定打手">
        {{
          boosterText(
            order.requestedBoosterName,
            order.requestedBoosterId,
            order.boosterSelectionMode === OrderBoosterSelectionMode.Specified
              ? "指定信息缺失"
              : "未指定"
          )
        }}
      </el-descriptions-item>
      <el-descriptions-item label="实际接单打手">
        {{ boosterText(order.boosterName, order.boosterId, "尚未接单") }}
      </el-descriptions-item>
      <el-descriptions-item label="商品原价（元）">
        {{ fenToYuan(order.originalAmountFen) }}
      </el-descriptions-item>
      <el-descriptions-item label="会员折扣">
        <template v-if="order.discountBp < FEE_RATE_BASE">
          {{ discountText(order.discountBp) }}（-{{
            fenToYuan(memberDiscountFen(order))
          }}
          元）
        </template>
        <template v-else>
          无折扣
        </template>
      </el-descriptions-item>
      <el-descriptions-item label="优惠券抵扣（元）">
        {{
          order.couponDeductionFen > 0
            ? `-${fenToYuan(order.couponDeductionFen)}`
            : "未用券"
        }}
      </el-descriptions-item>
      <el-descriptions-item label="实付金额（元）">
        {{ order.amountYuan }}
      </el-descriptions-item>
      <el-descriptions-item label="订单群">
        <el-button
          v-if="order.conversationId"
          link
          type="primary"
          @click="emit('enter-group', order)"
        >
          进入订单群
        </el-button>
        <template v-else>
          未建群（支付成功后自动创建）
        </template>
      </el-descriptions-item>
      <el-descriptions-item label="支付方式">
        {{ ORDER_PAYMENT_METHOD_TEXT[order.provider as OrderPaymentMethod] }}
      </el-descriptions-item>
      <el-descriptions-item label="渠道交易号">
        {{ order.providerTradeNo || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="下单用户">
        {{ order.userId }}
      </el-descriptions-item>
      <el-descriptions-item label="关联客服">
        {{ order.serviceAgentId || "未关联" }}
      </el-descriptions-item>
      <el-descriptions-item label="用户备注">
        {{ order.remark || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="备注附件">
        <div
          v-if="order.remarkMedia.length"
          class="media-list"
        >
          <template
            v-for="(item, index) in order.remarkMedia"
            :key="index"
          >
            <video
              v-if="item.type === 'video'"
              class="media-cell"
              :src="item.url"
              controls
              preload="metadata"
            />
            <el-image
              v-else
              class="media-cell"
              :src="item.url"
              :preview-src-list="[item.url]"
              fit="cover"
            />
          </template>
        </div>
        <template v-else>
          -
        </template>
      </el-descriptions-item>
      <el-descriptions-item label="其他账号信息">
        {{ order.accountInfo || "-" }}
      </el-descriptions-item>
      <el-descriptions-item label="下单时间">
        {{ formatDate(order.createdAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="支付时间">
        {{ formatDate(order.paidAt) }}
      </el-descriptions-item>
    </el-descriptions>
  </el-drawer>
</template>

<style scoped>
.media-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.media-cell {
  width: 72px;
  height: 72px;
  border-radius: 4px;
  object-fit: cover;
}

.refund-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.refund-content--danger {
  color: var(--el-color-danger);
}
</style>
