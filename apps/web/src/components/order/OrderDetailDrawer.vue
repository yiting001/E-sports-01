<script setup lang="ts">
/**
 * 订单详情抽屉：展示单笔订单的完整字段
 * （商品快照/价格明细/归属用户/关联客服/支付渠道交易号/备注/时间线），
 * 已建群订单提供进入订单群入口。
 */
import {
  FEE_RATE_BASE,
  ORDER_STATUS_TEXT,
  PAYMENT_PROVIDER_TEXT,
  fenToYuan,
  type AdminOrderView,
  type OrderStatus,
  type PaymentProvider,
} from '@app/contracts';

/** 会员折扣减免金额（分）= 原价 - 券抵扣 - 实付 */
function memberDiscountFen(order: AdminOrderView): number {
  return order.originalAmountFen - order.couponDeductionFen - order.amountFen;
}

/** 会员折扣文案：万分比 → 几折（如 9500 → 95 折） */
function discountText(discountBp: number): string {
  return `${(discountBp / (FEE_RATE_BASE / 100)).toFixed(0)} 折`;
}

defineProps<{
  /** 当前查看的订单，为空时不渲染内容 */
  order: AdminOrderView | null;
  /** 时间格式化函数（与列表页共用） */
  formatDate: (value: string) => string;
}>();

const emit = defineEmits<{
  /** 点击商品 → 由父页弹窗预览商品详情 */
  'view-product': [productId: string];
  /** 点击进入订单群 → 由父页加群并跳转 IM */
  'enter-group': [order: AdminOrderView];
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
      <el-descriptions-item label="商品原价（元）">
        {{ fenToYuan(order.originalAmountFen) }}
      </el-descriptions-item>
      <el-descriptions-item label="会员折扣">
        <template v-if="order.discountBp < FEE_RATE_BASE">
          {{ discountText(order.discountBp) }}（-{{ fenToYuan(memberDiscountFen(order)) }} 元）
        </template>
        <template v-else>
          无折扣
        </template>
      </el-descriptions-item>
      <el-descriptions-item label="优惠券抵扣（元）">
        {{ order.couponDeductionFen > 0 ? `-${fenToYuan(order.couponDeductionFen)}` : '未用券' }}
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
      <el-descriptions-item label="支付渠道">
        {{ PAYMENT_PROVIDER_TEXT[order.provider as PaymentProvider] }}
      </el-descriptions-item>
      <el-descriptions-item label="渠道交易号">
        {{ order.providerTradeNo || '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="下单用户">
        {{ order.userId }}
      </el-descriptions-item>
      <el-descriptions-item label="关联客服">
        {{ order.serviceAgentId || '未关联' }}
      </el-descriptions-item>
      <el-descriptions-item label="接单打手">
        {{ order.boosterId || '未接单' }}
      </el-descriptions-item>
      <el-descriptions-item label="用户备注">
        {{ order.remark || '-' }}
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
