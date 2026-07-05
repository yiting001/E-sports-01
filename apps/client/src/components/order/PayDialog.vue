<script setup lang="ts">
/**
 * 扫码支付弹层：按下单结果渲染支付二维码（支付宝/微信），
 * 轮询主动查单接口（后端调渠道官方查单，回调未达也能确认支付），
 * 支付成功后通知父组件；关闭即停止轮询。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import {
  OrderStatus,
  PaymentProvider,
  type CreateOrderResult,
} from '@app/contracts';
import { orderApi } from '@/api/order.api';

const props = defineProps<{ order: CreateOrderResult }>();
const emit = defineEmits<{ paid: []; close: [] }>();

/** 支付结果轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 3000;

const qrImage = ref('');
let timer: number | null = null;

const providerText =
  props.order.provider === PaymentProvider.Alipay ? '支付宝' : '微信';

async function poll(): Promise<void> {
  const order = await orderApi.payQuery(props.order.orderId);
  if (order.status !== OrderStatus.PendingPayment) {
    stopPolling();
    emit('paid');
  }
}

function stopPolling(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

onMounted(async () => {
  qrImage.value = await QRCode.toDataURL(props.order.qrCode, { width: 220 });
  timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
});

onBeforeUnmount(stopPolling);
</script>

<template>
  <div
    class="mask"
    @click.self="emit('close')"
  >
    <div class="dialog card">
      <h3 class="title">
        {{ providerText }}扫码支付
      </h3>
      <p class="amount">
        ¥{{ order.amountYuan }}
      </p>
      <img
        v-if="qrImage"
        :src="qrImage"
        class="qr"
        alt="支付二维码"
      >
      <p class="tip">
        请使用{{ providerText }}扫一扫完成支付，支付成功后自动跳转
      </p>
      <button
        class="close"
        @click="emit('close')"
      >
        取消支付
      </button>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
}

.dialog {
  width: min(320px, calc(100vw - 48px));
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.amount {
  font-family: var(--font-num);
  font-size: 26px;
  font-weight: 800;
  color: var(--c-accent);
}

.qr {
  width: 220px;
  height: 220px;
  border-radius: var(--radius-sm);
  background: #fff;
}

.tip {
  font-size: 12px;
  color: var(--c-text-secondary);
  text-align: center;
}

.close {
  margin-top: 4px;
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
