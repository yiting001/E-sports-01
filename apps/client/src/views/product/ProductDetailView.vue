<script setup lang="ts">
/**
 * 商品详情页（全屏，纯展示）：封面/标题/价格/富文本详情/用户评价，
 * 底部「立即下单」进入独立的下单页（/checkout/:productId）。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AxiosError } from 'axios';
import DOMPurify from 'dompurify';
import { BizCode, fenToYuan, type ProductPublicView } from '@app/contracts';
import SelectedBoosterNotice from '@/components/booster/SelectedBoosterNotice.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import ProductAssuranceBar from '@/components/product/ProductAssuranceBar.vue';
import ProductIntroCard from '@/components/product/ProductIntroCard.vue';
import ProductReviews from '@/components/product/ProductReviews.vue';
import { commerceApi } from '@/api/commerce.api';
import { resolveMediaUrl, resolveRichMediaUrls } from '@/utils/media-url';
import './ProductDetailView.responsive.css';

const route = useRoute();
const router = useRouter();

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);
const loadError = ref(false);
const coverFailed = ref(false);
const descExpanded = ref(false);

/** 折扣标签（如「4.2折」）；无原价或未降价时不展示 */
const discountLabel = computed(() => {
  const view = product.value;
  if (!view || view.originPriceFen <= view.priceFen) {
    return '';
  }
  const discount = (view.priceFen / view.originPriceFen) * 10;
  const text = discount >= 1 ? discount.toFixed(1).replace(/\.0$/, '') : '1';
  return `${text}折`;
});

const safeDescription = computed(() =>
  product.value
    ? resolveRichMediaUrls(DOMPurify.sanitize(product.value.description))
    : '',
);
const coverUrl = computed(() => resolveMediaUrl(product.value?.cover ?? ''));

function goCheckout(): void {
  if (product.value) {
    router.push(`/checkout/${product.value.id}`);
  }
}

async function loadProduct(): Promise<void> {
  loading.value = true;
  missing.value = false;
  loadError.value = false;
  coverFailed.value = false;
  try {
    product.value = await commerceApi.getProduct(String(route.params.id));
  } catch (error) {
    product.value = null;
    if (error instanceof AxiosError && error.response?.status === BizCode.NotFound) {
      missing.value = true;
    } else {
      loadError.value = true;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadProduct();
});
</script>

<template>
  <div class="detail">
    <header class="bar">
      <div class="bar-inner">
        <button
          type="button"
          class="back"
          aria-label="返回"
          @click="router.back()"
        >
          <AppIcon
            name="chevron"
            :size="20"
          />
        </button>
        <span class="name">商品详情</span>
      </div>
    </header>

    <div class="scroll">
      <section
        v-if="loading"
        class="hint-state"
        aria-live="polite"
      >
        <p>加载中…</p>
      </section>
      <section
        v-else-if="loadError"
        class="hint-state card"
        role="alert"
      >
        <h2>商品加载失败</h2>
        <p>请检查网络后重新加载。</p>
        <button
          type="button"
          class="retry"
          @click="loadProduct"
        >
          重新加载
        </button>
      </section>
      <section
        v-else-if="missing || !product"
        class="hint-state"
      >
        <p>商品不存在或已下架</p>
      </section>
      <template v-else>
        <div class="cover card">
          <img
            v-if="coverUrl && !coverFailed"
            :src="coverUrl"
            :alt="product.title"
            class="cover-image"
            @error="coverFailed = true"
          >
          <AppIcon
            v-else
            name="gem"
            :size="72"
            class="emblem"
          />
          <div class="cover-glow" />
        </div>

        <section class="card info">
          <h1 class="title">
            {{ product.title }}
          </h1>
          <div class="price-panel">
            <div class="price-line">
              <span class="price"><i class="price-symbol">¥</i>{{ fenToYuan(product.priceFen) }}</span>
              <span
                v-if="discountLabel"
                class="discount"
              >{{ discountLabel }}</span>
              <span
                v-if="product.originPriceFen > product.priceFen"
                class="origin"
              >¥{{ fenToYuan(product.originPriceFen) }}</span>
            </div>
            <span class="sold">已售 {{ product.sold }}</span>
          </div>
          <span class="category">{{ product.categoryName }}</span>
          <SelectedBoosterNotice class="selected-booster-notice" />
          <button
            type="button"
            class="buy desktop-buy"
            @click="goCheckout"
          >
            立即下单
          </button>
        </section>

        <ProductIntroCard
          v-if="product.coverTitle || product.coverSub"
          class="product-intro-section"
          :title="product.coverTitle"
          :subtitle="product.coverSub"
        />

        <ProductAssuranceBar class="assurances" />

        <section
          v-if="safeDescription"
          class="card desc"
          :class="{ 'desc--expanded': descExpanded }"
        >
          <h2 class="sec-title">
            商品详情
          </h2>
          <!-- eslint-disable vue/no-v-html -->
          <div class="desc-content">
            <div
              class="desc-body"
              v-html="safeDescription"
            />
          </div>
          <!-- eslint-enable vue/no-v-html -->
          <button
            type="button"
            class="desc-toggle"
            :aria-expanded="descExpanded"
            @click="descExpanded = !descExpanded"
          >
            {{ descExpanded ? '收起详情' : '展开详情' }}
          </button>
        </section>

        <ProductReviews :product-id="product.id" />
      </template>
    </div>

    <footer
      v-if="product"
      class="footer"
    >
      <div class="total">
        <span class="total-label">价格</span>
        <span class="total-value">¥{{ fenToYuan(product.priceFen) }}</span>
      </div>
      <button
        type="button"
        class="buy"
        @click="goCheckout"
      >
        立即下单
      </button>
    </footer>
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
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
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

.hint-state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.hint-state h2 {
  font-size: 17px;
  color: var(--c-text);
}

.retry {
  min-width: 112px;
  min-height: 42px;
  padding: 0 18px;
  color: var(--c-bg);
  font-size: 14px;
  font-weight: 800;
  background: var(--c-accent);
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.cover {
  position: relative;
  aspect-ratio: 16 / 9;
  display: grid;
  place-items: center;
  background: var(--c-cover-bg);
  overflow: hidden;
}

/* 封面底部渐隐，与下方卡片衔接更自然 */
.cover-glow {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 34%;
  background: linear-gradient(180deg, transparent, rgba(11, 14, 20, 0.55));
  pointer-events: none;
}

.cover,
.info,
.product-intro-section,
.assurances,
.desc,
.reviews {
  flex-shrink: 0;
}

.cover-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.emblem {
  color: rgba(61, 255, 155, 0.55);
  filter: drop-shadow(0 0 12px rgba(61, 255, 155, 0.32));
}

.info {
  padding: 16px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  line-height: 1.45;
  border-left: 3px solid var(--c-accent);
  padding-left: 10px;
}

/* 价格面板：战术金渐变底 + 左侧金色描边，突出优惠价 */
.price-panel {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(90deg, var(--c-accent-dim), transparent 78%);
  border-left: 2px solid var(--c-accent);
  border-radius: var(--radius-sm);
}

.price-line {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}

.price {
  font-family: var(--font-num);
  font-size: 26px;
  font-weight: 800;
  color: var(--c-accent);
  text-shadow: 0 0 18px rgba(255, 176, 32, 0.35);
}

.price-symbol {
  font-size: 15px;
  font-style: normal;
  margin-right: 1px;
}

.discount {
  flex-shrink: 0;
  padding: 2px 7px;
  font-size: 11px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%);
}

.origin {
  font-family: var(--font-num);
  font-size: 13px;
  color: var(--c-text-muted);
  text-decoration: line-through;
}

.sold {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.category {
  display: inline-block;
  margin-top: 12px;
  padding: 3px 12px;
  font-size: 11px;
  letter-spacing: 1px;
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border: 1px solid rgba(255, 176, 32, 0.3);
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
}

.selected-booster-notice {
  margin-top: 14px;
}

.desc {
  position: relative;
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

.desc-content {
  position: relative;
  max-height: 170px;
  overflow: hidden;
}

.desc-content::after {
  content: '';
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 58px;
  background: linear-gradient(180deg, transparent, var(--c-surface));
  pointer-events: none;
}

.desc--expanded .desc-content {
  max-height: none;
}

.desc--expanded .desc-content::after {
  display: none;
}

.desc-body :deep(img),
.desc-body :deep(video) {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  background: var(--c-bg);
}

.desc-toggle {
  width: 100%;
  margin-top: 12px;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 800;
  color: var(--c-accent);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.footer {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  border-top: 1px solid var(--c-border);
  background: color-mix(in srgb, var(--c-surface) 88%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
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
  padding: 12px 38px;
  font-size: 15px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2px;
  color: var(--c-bg);
  background: linear-gradient(135deg, #ffd066, var(--c-accent) 55%, #e89400);
  box-shadow: 0 6px 20px rgba(255, 176, 32, 0.32);
  clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  transition: filter 0.15s ease, transform 0.15s ease;
}

.buy:hover {
  filter: brightness(1.08);
}

.buy:active {
  transform: translateY(1px);
}

.desktop-buy {
  display: none;
}
</style>
