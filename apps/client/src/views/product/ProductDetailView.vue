<script setup lang="ts">
/**
 * 商品详情页（全屏，纯展示）：铺满主图/标题/价格/富文本详情/用户评价，
 * 主图预览由 ProductCoverPreview 负责，
 * 底部「立即下单」进入独立的下单页（/checkout/:productId）。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { AxiosError } from "axios";
import DOMPurify from "dompurify";
import {
  BizCode,
  fenToYuan,
  lowestProductPriceFen,
  type ProductPublicView,
} from "@app/contracts";
import SelectedBoosterNotice from "@/components/booster/SelectedBoosterNotice.vue";
import AppIcon from "@/components/common/AppIcon.vue";
import ProductAssuranceBar from "@/components/product/ProductAssuranceBar.vue";
import ProductCoverPreview from "@/components/product/ProductCoverPreview.vue";
import ProductIntroCard from "@/components/product/ProductIntroCard.vue";
import ProductPlatformPrices from "@/components/product/ProductPlatformPrices.vue";
import ProductReviews from "@/components/product/ProductReviews.vue";
import { commerceApi } from "@/api/commerce.api";
import { resolveMediaUrl, resolveRichMediaUrls } from "@/utils/media-url";
import "./ProductDetailView.responsive.css";

const route = useRoute();
const router = useRouter();

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);
const loadError = ref(false);
const descExpanded = ref(false);

const safeDescription = computed(() =>
  product.value
    ? resolveRichMediaUrls(DOMPurify.sanitize(product.value.description))
    : ""
);
const coverUrl = computed(() => resolveMediaUrl(product.value?.cover ?? ""));

function goCheckout(): void {
  if (product.value) {
    router.push(`/checkout/${product.value.id}`);
  }
}

async function loadProduct(): Promise<void> {
  loading.value = true;
  missing.value = false;
  loadError.value = false;
  try {
    product.value = await commerceApi.getProduct(String(route.params.id));
  } catch (error) {
    product.value = null;
    if (
      error instanceof AxiosError &&
      error.response?.status === BizCode.NotFound
    ) {
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
        <ProductCoverPreview
          class="cover card"
          :src="coverUrl"
          :alt="product.title"
        />

        <section class="card info">
          <h1 class="title">
            {{ product.title }}
          </h1>
          <ProductPlatformPrices :product="product" />
          <div class="meta">
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
            {{ descExpanded ? "收起详情" : "展开详情" }}
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
        <span class="total-value">¥{{ fenToYuan(lowestProductPriceFen(product)) }} 起</span>
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
  background: radial-gradient(
      70% 36% at 50% 0%,
      rgba(255, 176, 32, 0.07),
      transparent 70%
    ),
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
  clip-path: polygon(
    8px 0,
    100% 0,
    100% calc(100% - 8px),
    calc(100% - 8px) 100%,
    0 100%,
    0 8px
  );
}

.cover {
  min-width: 0;
}

.cover,
.info,
.product-intro-section,
.assurances,
.desc,
.reviews {
  flex-shrink: 0;
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

.sold {
  margin-left: 0;
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
  content: "";
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
