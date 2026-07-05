<script setup lang="ts">
/**
 * 充值弹层：输入金额（元）+ 选择支付宝/微信 → 发起充值拿二维码 →
 * 轮询主动查单接口（后端调渠道官方查单，回调未达也能确认入账），
 * 查到已支付即通知父组件。
 */
import { computed, onBeforeUnmount, ref } from 'vue';
import QRCode from 'qrcode';
import {
  PaymentProvider,
  RechargeStatus,
  WALLET_DEFAULTS,
  fenToYuan,
  yuanToFen,
  type CreateRechargeResult,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';

/** 支付方式选项（渠道 → 展示文案） */
const PROVIDERS = [
  { value: PaymentProvider.Alipay, label: '支付宝' },
  { value: PaymentProvider.Wechat, label: '微信支付' },
] as const;

/** 支付结果轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 3000;

const emit = defineEmits<{ paid: []; close: [] }>();

const toast = useToast();

const amountYuan = ref('');
const provider = ref<PaymentProvider>(WALLET_DEFAULTS.paymentProvider);
const submitting = ref(false);
const result = ref<CreateRechargeResult | null>(null);
const qrImage = ref('');
let timer: number | null = null;

const providerText = computed(
  () => PROVIDERS.find((p) => p.value === provider.value)?.label ?? '',
);

function stopPolling(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
}

/** 轮询主动查单：查到已支付即入账完成 */
async function poll(): Promise<void> {
  if (!result.value) {
    return;
  }
  const { status } = await walletApi.rechargeStatus(result.value.outTradeNo);
  if (status === RechargeStatus.Paid) {
    stopPolling();
    emit('paid');
  }
}

async function submit(): Promise<void> {
  const amountFen = yuanToFen(amountYuan.value);
  if (!Number.isInteger(amountFen) || amountFen < WALLET_DEFAULTS.minRechargeFen) {
    toast.show(`充值金额至少 ${fenToYuan(WALLET_DEFAULTS.minRechargeFen)} 元`);
    return;
  }
  submitting.value = true;
  try {
    result.value = await walletApi.recharge({
      amountFen,
      provider: provider.value,
    });
    qrImage.value = await QRCode.toDataURL(result.value.qrCode, { width: 220 });
    timer = window.setInterval(() => void poll(), POLL_INTERVAL_MS);
  } finally {
    submitting.value = false;
  }
}

onBeforeUnmount(stopPolling);
</script>

<template>
  <div
    class="mask"
    @click.self="emit('close')"
  >
    <div class="dialog card">
      <h3 class="title">
        余额充值
      </h3>

      <template v-if="!result">
        <label class="field">
          <span class="label">金额（元）</span>
          <input
            v-model="amountYuan"
            class="input"
            type="number"
            inputmode="decimal"
            placeholder="请输入充值金额"
          >
        </label>
        <div class="providers">
          <button
            v-for="opt in PROVIDERS"
            :key="opt.value"
            class="provider"
            :class="{ active: provider === opt.value }"
            @click="provider = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>
        <button
          class="primary"
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? '创建中…' : '生成付款码' }}
        </button>
      </template>

      <template v-else>
        <p class="amount">
          ¥{{ result.amountYuan }}
        </p>
        <img
          v-if="qrImage"
          :src="qrImage"
          class="qr"
          alt="充值二维码"
        >
        <p class="tip">
          请使用{{ providerText }}扫一扫完成支付，入账后自动刷新余额
        </p>
      </template>

      <button
        class="close"
        @click="emit('close')"
      >
        {{ result ? '取消支付' : '取消' }}
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
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.input {
  height: 40px;
  padding: 0 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.providers {
  width: 100%;
  display: flex;
  gap: 8px;
}

.provider {
  flex: 1;
  padding: 8px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.provider.active {
  color: var(--c-accent);
  border-color: var(--c-accent);
  font-weight: 700;
}

.primary {
  width: 100%;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.primary:disabled {
  opacity: 0.6;
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
  width: 100%;
  min-height: 40px;
  padding: 10px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
