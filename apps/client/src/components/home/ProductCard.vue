<script setup lang="ts">
/**
 * 商品卡片：封面图片（无图时回退宝石徽标占位）+ 标题/卖点/价格/销量。
 * 金额从「分」转「元」展示，复用 contracts 工具，禁止前端自算浮点。
 * 卖点文案取封面副标语 coverSub，不再从富文本详情提取摘要。
 * 点击进入商品详情页下单。
 */
import { useRouter } from "vue-router";
import {
  fenToYuan,
  lowestProductPriceFen,
  type ProductPublicView,
} from "@app/contracts";
import AppIcon from "@/components/common/AppIcon.vue";

defineProps<{ product: ProductPublicView }>();

const router = useRouter();
</script>

<template>
  <article
    class="product card"
    @click="router.push(`/products/${product.id}`)"
  >
    <div
      class="cover"
      :class="{ 'cover--image': product.cover }"
      :style="
        product.cover ? { backgroundImage: `url(${product.cover})` } : undefined
      "
    >
      <AppIcon
        v-if="!product.cover"
        name="gem"
        :size="64"
        class="emblem"
      />
    </div>
    <div class="info">
      <h3 class="title">
        {{ product.title }}
      </h3>
      <p class="desc">
        {{ product.coverSub }}
      </p>
      <div class="meta">
        <span class="price">¥{{ fenToYuan(lowestProductPriceFen(product)) }} 起</span>
        <span class="sold">已售 {{ product.sold }}</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product {
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.product:hover {
  transform: translateY(-2px);
  border-color: rgba(61, 255, 155, 0.5);
}

.cover {
  position: relative;
  aspect-ratio: 1 / 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 12px;
  background: var(--c-cover-bg);
  border-bottom: 1px solid rgba(61, 255, 155, 0.35);
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
  filter: drop-shadow(0 0 12px rgba(61, 255, 155, 0.35));
}

.info {
  padding: 10px 12px 12px;
}

.title {
  font-size: 15px;
  font-weight: 700;
  border-left: 3px solid var(--c-accent);
  padding-left: 8px;
}

.desc {
  margin-top: 6px;
  height: 36px;
  font-size: 12px;
  line-height: 18px;
  color: var(--c-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta {
  margin-top: 8px;
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.price {
  font-family: var(--font-num);
  font-size: 19px;
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
  font-size: 11px;
  color: var(--c-text-muted);
  white-space: nowrap;
}
</style>
