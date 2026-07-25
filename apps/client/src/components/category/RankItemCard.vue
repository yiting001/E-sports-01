<script setup lang="ts">
/**
 * 排行榜条目卡：名次编号 + 商品明细 + 销量热度 + 单一醒目下单操作。
 */
import { fenToYuan, lowestProductPriceFen } from "@app/contracts";
import type { RankItem } from "@/config/category.mock";
import AppIcon from "@/components/common/AppIcon.vue";
import ProductCoverThumb from "@/components/product/ProductCoverThumb.vue";
import { useRouter } from "vue-router";

defineProps<{
  item: RankItem;
  /** 名次（从 0 开始，展示时 +1 补零） */
  index: number;
}>();

const router = useRouter();

/** 前三名使用金色高亮 */
const TOP_COUNT = 3;

/** 名次补零：1 → 01，竞赛计分板惯例 */
function rankNo(index: number): string {
  return String(index + 1).padStart(2, "0");
}
</script>

<template>
  <article
    class="rank card"
    :class="{ 'rank--top': index < TOP_COUNT }"
  >
    <span
      class="no"
      :class="{ top: index < TOP_COUNT }"
    >
      {{ rankNo(index) }}
    </span>
    <ProductCoverThumb
      class="rank-cover"
      :src="item.product.cover"
      :fallback="item.product.coverTitle || item.product.title"
    />
    <button
      type="button"
      class="main"
      @click="router.push(`/products/${item.product.id}`)"
    >
      <div class="title-row">
        <h3 class="title">
          {{ item.product.title }}
        </h3>
        <span class="category-tag">
          {{ item.product.categoryName }}
        </span>
      </div>
      <p class="summary">
        <strong v-if="item.product.coverTitle">{{
          item.product.coverTitle
        }}</strong>
        <span v-if="item.product.coverSub">{{ item.product.coverSub }}</span>
        <span v-if="!item.product.coverTitle && !item.product.coverSub">查看商品详情</span>
      </p>
      <div class="stats">
        <span class="price">¥{{ fenToYuan(lowestProductPriceFen(item.product)) }} 起</span>
        <span class="sold">已售 {{ item.product.sold }}</span>
        <div
          class="bar"
          aria-hidden="true"
        >
          <div
            class="fill"
            :style="{ width: `${item.heat}%` }"
          />
        </div>
      </div>
    </button>
    <button
      type="button"
      class="order-action"
      @click="router.push(`/checkout/${item.product.id}`)"
    >
      <AppIcon
        name="card"
        :size="16"
      />
      立即下单
    </button>
  </article>
</template>

<style scoped>
.rank {
  display: grid;
  grid-template-columns: 52px 72px minmax(0, 1fr) 112px;
  align-items: center;
  gap: 12px;
  min-height: 112px;
  padding: 14px 16px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.rank-cover {
  --product-thumb-size: 72px;
}

.rank:hover {
  border-color: rgba(61, 255, 155, 0.42);
  transform: translateY(-1px);
}

.rank--top {
  border-color: rgba(255, 176, 32, 0.28);
}

.no {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  font-family: var(--font-num);
  font-size: 24px;
  font-weight: 800;
  font-style: italic;
  color: var(--c-text-muted);
  background: rgba(150, 165, 195, 0.08);
  border: 1px solid var(--c-border);
  clip-path: polygon(
    9px 0,
    100% 0,
    100% calc(100% - 9px),
    calc(100% - 9px) 100%,
    0 100%,
    0 9px
  );
}

.no.top {
  color: var(--c-accent);
  background: var(--c-accent-dim);
  border-color: rgba(255, 176, 32, 0.45);
  text-shadow: 0 0 12px rgba(255, 176, 32, 0.4);
}

.main {
  min-width: 0;
  display: block;
  text-align: left;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.title {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.category-tag {
  flex-shrink: 0;
  max-width: 45%;
  padding: 2px 8px;
  font-size: 11px;
  color: var(--c-neon);
  border: 1px solid rgba(61, 255, 155, 0.28);
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary {
  margin-top: 5px;
  font-size: 12px;
  color: var(--c-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.summary strong {
  margin-right: 8px;
  color: var(--c-neon);
}

.stats {
  margin-top: 8px;
  display: grid;
  grid-template-columns: auto auto auto minmax(72px, 1fr);
  align-items: center;
  gap: 8px;
}

.bar {
  height: 6px;
  background: rgba(150, 165, 195, 0.14);
  transform: skewX(-18deg);
  overflow: hidden;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 176, 32, 0.5), var(--c-accent));
}

.sold {
  font-size: 12px;
  color: var(--c-text-secondary);
  white-space: nowrap;
}

.price {
  font-family: var(--font-num);
  font-size: 16px;
  font-weight: 800;
  color: var(--c-accent);
  white-space: nowrap;
}

.origin {
  font-family: var(--font-num);
  font-size: 10px;
  color: var(--c-text-muted);
  text-decoration: line-through;
  white-space: nowrap;
}

.order-action {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  clip-path: polygon(
    6px 0,
    100% 0,
    100% calc(100% - 6px),
    calc(100% - 6px) 100%,
    0 100%,
    0 6px
  );
}

@media (max-width: 767px) {
  .rank {
    grid-template-columns: 44px 64px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
    padding: 14px;
  }

  .rank-cover {
    --product-thumb-size: 64px;
  }

  .no {
    width: 44px;
    height: 44px;
    font-size: 22px;
  }

  .title-row {
    gap: 8px;
  }

  .stats {
    grid-template-columns: auto auto 1fr;
    gap: 8px;
  }

  .bar {
    grid-column: 1 / -1;
  }

  .order-action {
    grid-column: 2 / -1;
    width: 100%;
    min-height: 44px;
  }
}
</style>
