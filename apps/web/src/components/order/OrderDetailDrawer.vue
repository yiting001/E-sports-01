<script setup lang="ts">
/**
 * 订单详情抽屉：展示单笔订单的完整字段
 * （商品快照/归属用户/关联客服/支付渠道交易号/备注/时间线）。
 */
import {
  ORDER_STATUS_TEXT,
  PAYMENT_PROVIDER_TEXT,
  type AdminOrderView,
  type OrderStatus,
  type PaymentProvider,
} from '@app/contracts';

defineProps<{
  /** 当前查看的订单，为空时不渲染内容 */
  order: AdminOrderView | null;
  /** 时间格式化函数（与列表页共用） */
  formatDate: (value: string) => string;
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
        {{ order.productTitle }}
      </el-descriptions-item>
      <el-descriptions-item label="数量">
        {{ order.quantity }}
      </el-descriptions-item>
      <el-descriptions-item label="金额（元）">
        {{ order.amountYuan }}
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
