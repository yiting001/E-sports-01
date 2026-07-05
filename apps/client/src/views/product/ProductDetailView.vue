<script setup lang="ts">
/**
 * 商品详情页（全屏，纯展示）：封面/标题/价格/富文本详情/用户评价，
 * 底部「立即下单」进入独立的下单页（/checkout/:productId）。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DOMPurify from 'dompurify';
import { fenToYuan, type ProductPublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import ProductReviews from '@/components/product/ProductReviews.vue';
import { commerceApi } from '@/api/commerce.api';
import './ProductDetailView.responsive.css';

const route = useRoute();
const router = useRouter();

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);
const descExpanded = ref(false);

const safeDescription = computed(() =>
  product.value ? DOMPurify.sanitize(product.value.description) : '',
);

function goCheckout(): void {
  if (product.value) {
    router.push(`/checkout/${product.value.id}`);
  }
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
      <div class="bar-inner">
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
          <button
            class="buy desktop-buy"
            @click="goCheckout"
          >
            立即下单
          </button>
        </section>

        <section
          v-if="safeDescription"
          class="card desc"
          :class="{ 'desc--expanded': descExpanded }"
        >
          <h2 class="sec-title">
            服务详情
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

.cover,
.info,
.desc,
.reviews {
  flex-shrink: 0;
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

.desktop-buy {
  display: none;
}
</style>
