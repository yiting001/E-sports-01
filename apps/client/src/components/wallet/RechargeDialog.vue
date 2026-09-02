<script setup lang="ts">
/**
 * 充值弹层：输入金额（元）+ 选择支付宝/微信 → 发起充值：
 * 扫码渠道渲染二维码；微信内且后台开启公众号 JSAPI 时直接调 WeixinJSBridge 拉起收银台。
 * 均轮询主动查单接口（后端调渠道官方查单，回调未达也能确认入账），
 * 页面恢复可见时立即补查（微信等内置浏览器后台会冻结定时器），
 * 查到已支付即通知父组件；下单时透传应用内回跳地址，供支持同步跳转的网关支付后跳回。
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
import { usePortalStore } from '@/stores/portal.store';
import { buildClientPayReturnUrl } from '@/utils/pay-return';
import {
  createPayStatusPoller,
  type PayStatusPoller,
} from '@/utils/pay-status-poller';
import { isWechatBrowser } from '@/utils/wechat-env';
import { invokeWechatJsapiPay } from '@/utils/wechat-jsapi';

/** 支付方式选项（渠道 → 展示文案） */
const PROVIDERS = [
  { value: PaymentProvider.Alipay, label: '支付宝' },
  { value: PaymentProvider.Wechat, label: '微信支付' },
] as const;

/** 支付结果轮询间隔（毫秒） */
const POLL_INTERVAL_MS = 3000;

const emit = defineEmits<{ paid: []; close: [] }>();

const toast = useToast();
const portal = usePortalStore();

const amountYuan = ref('');
const provider = ref<PaymentProvider>(WALLET_DEFAULTS.paymentProvider);
const submitting = ref(false);
const result = ref<CreateRechargeResult | null>(null);
const qrImage = ref('');
const feedback = ref('');
/** JSAPI 拉起中（防重复点击） */
const invoking = ref(false);
let poller: PayStatusPoller | null = null;
let pollInFlight = false;
let disposed = false;

const providerText = computed(
  () => PROVIDERS.find((p) => p.value === provider.value)?.label ?? '',
);
/** 微信内且后台开启公众号支付时，选“微信支付”实际走 JSAPI 直接拉起 */
const submitProvider = computed(() =>
  provider.value === PaymentProvider.Wechat && isWechatBrowser() && portal.wechatJsapiPayEnabled
    ? PaymentProvider.WechatJsapi
    : provider.value,
);
const isJsapi = computed(() => Boolean(result.value?.jsapiParams));
const submitLabel = computed(() => {
  if (submitting.value) {
    return '创建中…';
  }
  return submitProvider.value === PaymentProvider.WechatJsapi ? '微信支付' : '生成付款码';
});

function stopPolling(): void {
  poller?.dispose();
  poller = null;
}

/** 轮询主动查单：查到已支付即入账完成 */
async function poll(): Promise<void> {
  if (!result.value || pollInFlight || disposed) {
    return;
  }
  pollInFlight = true;
  try {
    const { status } = await walletApi.rechargeStatus(result.value.outTradeNo, { silent: true });
    if (disposed) {
      return;
    }
    if (status === RechargeStatus.Paid) {
      stopPolling();
      emit('paid');
    } else if (status === RechargeStatus.Closed) {
      stopPolling();
      feedback.value = '充值单已关闭，请重新发起充值';
    }
  } catch {
    if (!disposed) {
      feedback.value = '支付状态查询失败，将自动重试';
    }
  } finally {
    pollInFlight = false;
  }
}

/** 拉起微信收银台；取消/失败后可重新拉起，成功以查单结果为准 */
async function invokeJsapi(): Promise<void> {
  const jsapiParams = result.value?.jsapiParams;
  if (invoking.value || !jsapiParams) {
    return;
  }
  invoking.value = true;
  feedback.value = '';
  try {
    const outcome = await invokeWechatJsapiPay(jsapiParams);
    if (disposed) {
      return;
    }
    if (outcome === 'ok') {
      void poll();
    } else if (outcome === 'cancel') {
      feedback.value = '已取消支付，可重新拉起';
    } else {
      feedback.value = '拉起微信支付失败，请重试';
    }
  } finally {
    invoking.value = false;
  }
}

async function submit(): Promise<void> {
  const amountFen = yuanToFen(amountYuan.value);
  if (!Number.isInteger(amountFen) || amountFen < WALLET_DEFAULTS.minRechargeFen) {
    toast.show(`充值金额至少 ${fenToYuan(WALLET_DEFAULTS.minRechargeFen)} 元`);
    return;
  }
  submitting.value = true;
  feedback.value = '';
  try {
    const created = await walletApi.recharge({
      amountFen,
      provider: submitProvider.value,
      returnUrl: buildClientPayReturnUrl(),
    });
    if (disposed) {
      return;
    }
    result.value = created;
    if (created.jsapiParams) {
      void invokeJsapi();
    } else {
      try {
        qrImage.value = await QRCode.toDataURL(created.qrCode, { width: 220 });
      } catch {
        feedback.value = '支付二维码生成失败，请关闭后重试';
      }
    }
    poller = createPayStatusPoller(() => void poll(), POLL_INTERVAL_MS);
  } finally {
    submitting.value = false;
  }
}

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
          {{ submitLabel }}
        </button>
      </template>

      <template v-else>
        <p class="amount">
          ¥{{ result.amountYuan }}
        </p>
        <template v-if="isJsapi">
          <button
            type="button"
            class="primary"
            :disabled="invoking"
            @click="invokeJsapi"
          >
            {{ invoking ? '拉起支付中…' : '拉起微信支付' }}
          </button>
          <p class="tip">
            在微信收银台完成支付，入账后自动刷新余额
          </p>
        </template>
        <template v-else>
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
        <p
          v-if="feedback"
          class="feedback"
          role="alert"
        >
          {{ feedback }}
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

.feedback {
  font-size: 12px;
  color: var(--c-danger);
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
