<script setup lang="ts">
/**
 * 支付弹层：扫码支付渲染二维码（支付宝/微信 Native）；
 * 公众号 JSAPI 支付则直接调 WeixinJSBridge 拉起收银台，不出二维码。
 * 均轮询主动查单接口（后端调渠道官方查单，回调未达也能确认支付），
 * 页面恢复可见时立即补查（微信等内置浏览器后台会冻结定时器），
 * 支付成功后通知父组件；关闭即停止轮询。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';
import QRCode from 'qrcode';
import {
  ORDER_PAYMENT_METHOD_TEXT,
  OrderStatus,
  type CreateOrderResult,
} from '@app/contracts';
import { orderApi } from '@/api/order.api';
import { isOrderPaid } from '@/utils/order-status';
import {
  createPayStatusPoller,
  type PayStatusPoller,
} from '@/utils/pay-status-poller';
import { invokeWechatJsapiPay } from '@/utils/wechat-jsapi';

const props = defineProps<{ order: CreateOrderResult }>();
const emit = defineEmits<{ paid: []; close: [] }>();

/** 支付结果轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 3000;

const qrImage = ref('');
const qrError = ref('');
const queryMessage = ref('');
let poller: PayStatusPoller | null = null;
let pollInFlight = false;
let disposed = false;

const providerText = ORDER_PAYMENT_METHOD_TEXT[props.order.provider];
/** 是否为公众号 JSAPI 支付（直接拉起收银台，不出二维码） */
const isJsapi = props.order.jsapiParams !== null;
/** JSAPI 拉起中（防重复点击） */
const invoking = ref(false);

async function poll(): Promise<void> {
  if (pollInFlight || disposed) {
    return;
  }
  pollInFlight = true;
  try {
    const order = await orderApi.payQuery(props.order.orderId, { silent: true });
    if (disposed) {
      return;
    }
    queryMessage.value = '';
    if (isOrderPaid(order)) {
      stopPolling();
      emit('paid');
      return;
    }
    if (order.status === OrderStatus.Cancelled) {
      stopPolling();
      queryMessage.value = '订单已取消，未完成支付';
    }
  } catch {
    if (!disposed) {
      queryMessage.value = '支付状态查询失败，将自动重试';
    }
  } finally {
    pollInFlight = false;
  }
}

function stopPolling(): void {
  poller?.dispose();
  poller = null;
}

/** 拉起微信收银台；取消/失败后可重新拉起，成功以查单结果为准 */
async function invokeJsapi(): Promise<void> {
  if (invoking.value || !props.order.jsapiParams) {
    return;
  }
  invoking.value = true;
  queryMessage.value = '';
  try {
    const outcome = await invokeWechatJsapiPay(props.order.jsapiParams);
    if (disposed) {
      return;
    }
    if (outcome === 'ok') {
      void poll();
    } else if (outcome === 'cancel') {
      queryMessage.value = '已取消支付，可重新拉起';
    } else {
      queryMessage.value = '拉起微信支付失败，请重试';
    }
  } finally {
    invoking.value = false;
  }
}

onMounted(async () => {
  if (isJsapi) {
    void invokeJsapi();
  } else {
    try {
      qrImage.value = await QRCode.toDataURL(props.order.qrCode, { width: 220 });
    } catch {
      if (!disposed) {
        qrError.value = '支付二维码生成失败，请关闭后重试';
      }
    }
  }
  if (disposed) {
    return;
  }
  void poll();
  poller = createPayStatusPoller(() => void poll(), POLL_INTERVAL_MS);
});

onBeforeUnmount(() => {
  disposed = true;
  stopPolling();
});
</script>

<template>
  <div
    class="mask"
    @click.self="emit('close')"
  >
    <div class="dialog card">
      <h3 class="title">
        {{ providerText }}{{ isJsapi ? '支付' : '扫码支付' }}
      </h3>
      <p class="amount">
        ¥{{ order.amountYuan }}
      </p>
      <template v-if="isJsapi">
        <button
          type="button"
          class="jsapi-pay"
          :disabled="invoking"
          @click="invokeJsapi"
        >
          {{ invoking ? '拉起支付中…' : '拉起微信支付' }}
        </button>
        <p class="tip">
          在微信收银台完成支付，支付成功后自动跳转
        </p>
      </template>
      <template v-else>
        <img
          v-if="qrImage"
          :src="qrImage"
          class="qr"
          alt="支付二维码"
        >
        <p class="tip">
          请使用{{ providerText }}扫一扫完成支付，支付成功后自动跳转
        </p>
      </template>
      <p
        v-if="qrError || queryMessage"
        class="feedback"
        role="alert"
      >
        {{ queryMessage || qrError }}
      </p>
      <button
        class="close"
        @click="emit('close')"
      >
        {{ queryMessage.includes('已取消') ? '关闭' : '取消支付' }}
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

.feedback {
  min-height: 18px;
  font-size: 12px;
  color: #ff8a8a;
  text-align: center;
}

.jsapi-pay {
  min-width: 180px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: #2aae67;
  border-radius: var(--radius-sm);
}

.jsapi-pay:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
