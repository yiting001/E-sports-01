<script setup lang="ts">
/**
 * 首页：搜索 → 推广横幅 → 滚动公告 → 快捷入口 → 分类签 → 商品网格。
 * 商品网格响应式：移动端 2 列，PC 端 3~4 列（CSS grid 自适应）。
 */
import { ref } from 'vue';
import CategoryChips from '@/components/home/CategoryChips.vue';
import HomeBanner from '@/components/home/HomeBanner.vue';
import HomeSearchBar from '@/components/home/HomeSearchBar.vue';
import NoticeBar from '@/components/home/NoticeBar.vue';
import ProductCard from '@/components/home/ProductCard.vue';
import QuickEntries from '@/components/home/QuickEntries.vue';
import { CATEGORY_CHIPS, HOME_PRODUCTS } from '@/config/home.mock';

/** 当前激活的分类签（UI 阶段仅切换高亮，后续驱动商品筛选） */
const activeChip = ref(0);
</script>

<template>
  <div class="home">
    <HomeSearchBar />
    <HomeBanner />
    <NoticeBar />
    <QuickEntries />
    <CategoryChips
      v-model="activeChip"
      :chips="CATEGORY_CHIPS"
    />
    <div class="products">
      <ProductCard
        v-for="product in HOME_PRODUCTS"
        :key="product.id"
        :product="product"
      />
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.products {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 768px) {
  .products {
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }
}

@media (min-width: 1024px) {
  .products {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
