<script setup lang="ts">
/**
 * 支付回跳落地页：支付渠道（计全付）支付完成/取消后同步跳回此页。
 * 只读取回跳参数定位单据（payKind/payRef），支付结果一律以服务端主动查单为准：
 * 充值查充值单状态、订单查订单支付状态；确认已支付后跳回钱包/订单详情，
 * 未支付则轮询有限次数后提示用户手动重查或返回。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import { PayReturnKind, PayReturnPageAction } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { orderApi } from '@/api/order.api';
import { walletApi } from '@/api/wallet.api';
import { parsePayReturnParams, type PayReturnParams } from '@/utils/pay-return';
import { queryPayReturnResult } from '@/utils/pay-return-query';
import {
  createPayStatusPoller,
  type PayStatusPoller,
} from '@/utils/pay-status-poller';

/** 查单轮询间隔（毫秒）与最大次数：渠道异步通知通常在数秒内到达 */
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 10;
/** 确认已支付后自动跳回业务页的延迟（毫秒），留出成功提示可读时间 */
const REDIRECT_DELAY_MS = 1500;

type PageState = 'invalid' | 'confirming' | 'paid' | 'pending' | 'closed' | 'error';

const route = useRoute();
const router = useRouter();

const params = ref<PayReturnParams | null>(null);
const state = ref<PageState>('confirming');
let poller: PayStatusPoller | null = null;
let attempts = 0;
let pollInFlight = false;
let disposed = false;
let redirectTimer: ReturnType<typeof setTimeout> | null = null;

const isRecharge = computed(() => params.value?.kind === PayReturnKind.Recharge);
const businessName = computed(() => (isRecharge.value ? '充值' : '订单'));

/** 支付结果确认后应回到的业务页 */
const targetRoute = computed<RouteLocationRaw>(() => {
  if (!params.value || isRecharge.value) {
    return { name: 'wallet' };
  }
  return { name: 'order-detail', params: { id: params.value.ref } };
});

const title = computed(() => {
  switch (state.value) {
    case 'paid':
      return `${businessName.value}支付成功`;
    case 'closed':
      return isRecharge.value ? '充值单已关闭' : '订单已取消';
    case 'pending':
      return '暂未查询到支付结果';
    case 'error':
      return '支付结果查询失败';
    case 'invalid':
      return '无法识别的支付结果';
    default:
      return '正在确认支付结果…';
  }
});

const description = computed(() => {
  switch (state.value) {
    case 'paid':
      return isRecharge.value
        ? '余额已入账，即将返回钱包'
        : '订单已支付，即将前往订单详情';
    case 'closed':
      return '本次支付未完成，如已扣款请联系客服核实';
    case 'pending':
      return '若已完成支付，入账可能稍有延迟，可稍后重新查询';
    case 'error':
      return '网络异常，请重试';
    case 'invalid':
      return '缺少支付单据信息，请回到应用内查看';
    default:
      return params.value?.action === PayReturnPageAction.Cancel
        ? '检测到您取消了支付，正在核实实际支付状态'
        : '请稍候，正在向支付渠道确认';
  }
});

function stopPolling(): void {
  poller?.dispose();
  poller = null;
}

function goTarget(): void {
  void router.replace(targetRoute.value);
}

function goOrders(): void {
  void router.replace({ name: 'orders' });
}

async function poll(): Promise<void> {
  if (!params.value || pollInFlight || disposed) {
    return;
  }
  pollInFlight = true;
  attempts += 1;
  try {
    const result = await queryPayReturnResult(params.value, {
      rechargeStatus: (outTradeNo) => walletApi.rechargeStatus(outTradeNo, { silent: true }),
      orderPayQuery: (orderId) => orderApi.payQuery(orderId, { silent: true }),
    });
    if (disposed) {
      return;
    }
    if (result === 'paid') {
      stopPolling();
      state.value = 'paid';
      redirectTimer = setTimeout(goTarget, REDIRECT_DELAY_MS);
      return;
    }
    if (result === 'closed') {
      stopPolling();
      state.value = 'closed';
      return;
    }
    // 用户主动取消时不再反复轮询，一次核实无果即提示
    const cancelled = params.value.action === PayReturnPageAction.Cancel;
    if (cancelled || attempts >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      state.value = 'pending';
    }
  } catch {
    if (!disposed) {
      stopPolling();
      state.value = 'error';
    }
  } finally {
    pollInFlight = false;
  }
}

/** 开始/重新开始确认：重置次数并立即查一次，再按间隔轮询 */
function startConfirm(): void {
  stopPolling();
  attempts = 0;
  state.value = 'confirming';
  void poll();
  poller = createPayStatusPoller(() => void poll(), POLL_INTERVAL_MS);
}

onMounted(() => {
  params.value = parsePayReturnParams(route.query);
  if (!params.value) {
    state.value = 'invalid';
    return;
  }
  startConfirm();
});

onBeforeUnmount(() => {
  disposed = true;
  stopPolling();
  if (redirectTimer !== null) {
    clearTimeout(redirectTimer);
  }
});
</script>

<template>
  <div class="pay-return-page client-page">
    <header class="bar">
      <div class="bar-inner">
        <span class="name">支付结果</span>
      </div>
    </header>

    <main class="body">
      <section
        class="card result"
        :class="`result--${state}`"
        role="status"
      >
        <span
          class="icon"
          aria-hidden="true"
        >
          <AppIcon
            v-if="state === 'paid'"
            name="shield"
            :size="28"
          />
          <AppIcon
            v-else-if="state === 'confirming'"
            name="refresh"
            :size="28"
          />
          <AppIcon
            v-else
            name="bell"
            :size="28"
          />
        </span>
        <h2 class="title">
          {{ title }}
        </h2>
        <p class="desc">
          {{ description }}
        </p>

        <div class="actions">
          <button
            v-if="state === 'pending' || state === 'error'"
            class="act act--primary"
            @click="startConfirm"
          >
            重新查询
          </button>
          <button
            v-if="state !== 'confirming'"
            class="act"
            :class="{ 'act--primary': state === 'paid' }"
            @click="goTarget"
          >
            {{ isRecharge || state === 'invalid' ? '返回钱包' : '查看订单' }}
          </button>
          <button
            v-if="!isRecharge && state !== 'confirming' && state !== 'invalid'"
            class="act"
            @click="goOrders"
          >
            我的订单
          </button>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.pay-return-page {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.name {
  font-size: 15px;
  font-weight: 800;
}

.body {
  flex: 1;
  padding: 32px 16px;
}

.result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 20px;
  text-align: center;
}

.icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  color: var(--c-text-secondary);
  background: var(--c-bg);
}

.result--paid .icon {
  color: var(--c-accent);
}

.result--closed .icon,
.result--error .icon,
.result--invalid .icon {
  color: var(--c-danger);
}

.title {
  font-size: 17px;
  font-weight: 800;
}

.desc {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

.act {
  width: 100%;
  min-height: 42px;
  font-size: 14px;
  font-weight: 700;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.act--primary {
  color: var(--c-bg);
  background: var(--c-accent);
  border-color: var(--c-accent);
}
</style>
