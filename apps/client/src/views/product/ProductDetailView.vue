<script setup lang="ts">
/**
 * 商品详情页（全屏）：封面/标题/价格/富文本详情 + 数量/备注/支付方式选择，
 * 下单后弹出扫码支付（支付宝/微信），支付成功跳转我的订单。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DOMPurify from 'dompurify';
import {
  ORDER_LIMITS,
  PaymentProvider,
  fenToYuan,
  type CreateOrderResult,
  type ProductPublicView,
} from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import PayDialog from '@/components/order/PayDialog.vue';
import { commerceApi } from '@/api/commerce.api';
import { orderApi } from '@/api/order.api';
import { useAuthStore } from '@/stores/auth.store';
import { useToast } from '@/composables/use-toast';

/** 支付方式选项（渠道 → 展示文案） */
const PROVIDERS = [
  { value: PaymentProvider.Alipay, label: '支付宝' },
  { value: PaymentProvider.Wechat, label: '微信支付' },
] as const;

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToast();

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);

const quantity = ref(1);
const remark = ref('');
const provider = ref<PaymentProvider>(PaymentProvider.Alipay);
const submitting = ref(false);
const payOrder = ref<CreateOrderResult | null>(null);

const safeDescription = computed(() =>
  product.value ? DOMPurify.sanitize(product.value.description) : '',
);

/** 应付总额（分 → 元展示，由 contracts 工具换算） */
const totalYuan = computed(() =>
  product.value ? fenToYuan(product.value.priceFen * quantity.value) : '0.00',
);

function changeQuantity(delta: number): void {
  const next = quantity.value + delta;
  if (next >= ORDER_LIMITS.quantityMin && next <= ORDER_LIMITS.quantityMax) {
    quantity.value = next;
  }
}

async function submit(): Promise<void> {
  if (!product.value) {
    return;
  }
  if (!auth.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } });
    return;
  }
  submitting.value = true;
  try {
    payOrder.value = await orderApi.create({
      productId: product.value.id,
      quantity: quantity.value,
      provider: provider.value,
      remark: remark.value.trim() || undefined,
    });
  } finally {
    submitting.value = false;
  }
}

function onPaid(): void {
  payOrder.value = null;
  toast.show('支付成功，客服将尽快为您安排服务');
  router.replace('/orders');
}

onMounted(async () => {
  try {
    product.value = await commerceApi.getProduct(String(route.params.id));
  } catch {
    missing.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="detail">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">商品详情</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="missing || !product"
        class="hint"
      >
        商品不存在或已下架
      </p>
      <template v-else>
        <div
          class="cover card"
          :class="{ 'cover--image': product.cover }"
          :style="product.cover ? { backgroundImage: `url(${product.cover})` } : undefined"
        >
          <AppIcon
            v-if="!product.cover"
            name="gem"
            :size="72"
            class="emblem"
          />
          <p class="cover-title">
            {{ product.coverTitle }}
          </p>
          <p class="cover-sub">
            {{ product.coverSub }}
          </p>
        </div>

        <section class="card info">
          <h1 class="title">
            {{ product.title }}
          </h1>
          <div class="meta">
            <span class="price">¥{{ fenToYuan(product.priceFen) }}</span>
            <span class="origin">{{ fenToYuan(product.originPriceFen) }}</span>
            <span class="sold">已售 {{ product.sold }}</span>
          </div>
          <span class="category">{{ product.categoryName }}</span>
        </section>

        <section class="card form">
          <div class="row">
            <span class="label">数量</span>
            <div class="stepper">
              <button
                class="step"
                :disabled="quantity <= ORDER_LIMITS.quantityMin"
                @click="changeQuantity(-1)"
              >
                −
              </button>
              <span class="count">{{ quantity }}</span>
              <button
                class="step"
                :disabled="quantity >= ORDER_LIMITS.quantityMax"
                @click="changeQuantity(1)"
              >
                ＋
              </button>
            </div>
          </div>
          <div class="row row--col">
            <span class="label">备注</span>
            <textarea
              v-model="remark"
              class="remark"
              :maxlength="ORDER_LIMITS.remarkMax"
              placeholder="大区/段位/开黑时间等（选填）"
            />
          </div>
          <div class="row">
            <span class="label">支付方式</span>
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
          </div>
        </section>

        <section
          v-if="safeDescription"
          class="card desc"
        >
          <h2 class="sec-title">
            服务详情
          </h2>
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="desc-body"
            v-html="safeDescription"
          />
          <!-- eslint-enable vue/no-v-html -->
        </section>
      </template>
    </div>

    <footer
      v-if="product"
      class="footer"
    >
      <div class="total">
        <span class="total-label">合计</span>
        <span class="total-value">¥{{ totalYuan }}</span>
      </div>
      <button
        class="buy"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? '下单中…' : '立即下单' }}
      </button>
    </footer>

    <PayDialog
      v-if="payOrder"
      :order="payOrder"
      @paid="onPaid"
      @close="payOrder = null"
    />
  </div>
</template>

<style scoped>
.detail {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 14px;
  background: var(--c-cover-bg);
  overflow: hidden;
}

.cover--image {
  background-size: cover;
  background-position: center;
}

.emblem {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -60%);
  color: rgba(61, 255, 155, 0.55);
}

.cover-title {
  position: relative;
  font-size: 17px;
  font-weight: 900;
  font-style: italic;
  color: var(--c-neon);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.cover-sub {
  position: relative;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  color: #fff;
}

.info {
  padding: 14px 16px;
}

.title {
  font-size: 17px;
  font-weight: 800;
  border-left: 3px solid var(--c-accent);
  padding-left: 8px;
}

.meta {
  margin-top: 10px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.price {
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 800;
  color: var(--c-accent);
}

.origin {
  font-family: var(--font-num);
  font-size: 12px;
  color: var(--c-text-muted);
  text-decoration: line-through;
}

.sold {
  margin-left: auto;
  font-size: 12px;
  color: var(--c-text-muted);
}

.category {
  display: inline-block;
  margin-top: 8px;
  padding: 2px 10px;
  font-size: 11px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: 999px;
}

.form {
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row--col {
  flex-direction: column;
  align-items: stretch;
}

.label {
  font-size: 13px;
  font-weight: 700;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.step {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  color: var(--c-text);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.step:disabled {
  opacity: 0.4;
}

.count {
  min-width: 28px;
  text-align: center;
  font-family: var(--font-num);
  font-weight: 700;
}

.remark {
  min-height: 66px;
  padding: 10px 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.5;
  resize: vertical;
}

.providers {
  display: flex;
  gap: 8px;
}

.provider {
  padding: 7px 14px;
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

.desc {
  padding: 14px 16px;
}

.sec-title {
  font-size: 14px;
  font-weight: 800;
  font-style: italic;
}

.desc-body {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-secondary);
  word-break: break-word;
}

.desc-body :deep(img),
.desc-body :deep(video) {
  max-width: 100%;
  border-radius: var(--radius-sm);
}

.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--c-border);
  background: var(--c-surface);
}

.total {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.total-label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.total-value {
  font-family: var(--font-num);
  font-size: 22px;
  font-weight: 800;
  color: var(--c-accent);
}

.buy {
  padding: 11px 34px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.buy:disabled {
  opacity: 0.6;
}
</style>
