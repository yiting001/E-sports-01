<script setup lang="ts">
/**
 * 首页：搜索 → 推广横幅 → 滚动公告 → 快捷入口 → 分类签 → 商品网格。
 * 分类签与商品网格来自后端公开接口；分类签首项为「全部」，切换即按分类筛选上架商品。
 * 商品网格响应式：移动端 2 列，PC 端 3~4 列（CSS grid 自适应）。
 */
import { computed, onMounted, ref } from 'vue';
import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import CategoryChips from '@/components/home/CategoryChips.vue';
import HomeBanner from '@/components/home/HomeBanner.vue';
import HomeSearchBar from '@/components/home/HomeSearchBar.vue';
import NoticeBar from '@/components/home/NoticeBar.vue';
import ProductCard from '@/components/home/ProductCard.vue';
import QuickEntries from '@/components/home/QuickEntries.vue';
import { commerceApi } from '@/api/commerce.api';

const categories = ref<CategoryPublicView[]>([]);
const products = ref<ProductPublicView[]>([]);
const loading = ref(false);
/** 当前激活的分类签：0 为「全部」，其余对应 categories 下标 +1 */
const activeChip = ref(0);

const chips = computed(() => ['全部', ...categories.value.map((c) => c.name)]);

async function loadProducts(): Promise<void> {
  loading.value = true;
  try {
    const categoryId =
      activeChip.value === 0 ? undefined : categories.value[activeChip.value - 1]?.id;
    const res = await commerceApi.listProducts({ page: 1, pageSize: 50, categoryId });
    products.value = res.list;
  } finally {
    loading.value = false;
  }
}

async function onChipChange(index: number): Promise<void> {
  activeChip.value = index;
  await loadProducts();
}

onMounted(async () => {
  categories.value = await commerceApi.listCategories();
  await loadProducts();
});
</script>

<template>
  <div class="home">
    <HomeSearchBar />
    <HomeBanner />
    <NoticeBar />
    <QuickEntries />
    <CategoryChips
      :model-value="activeChip"
      :chips="chips"
      @update:model-value="onChipChange"
    />
    <div
      v-if="products.length"
      class="products"
    >
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>
    <p
      v-else-if="!loading"
      class="empty"
    >
      暂无上架商品
    </p>
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

.empty {
  padding: 40px 0;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 14px;
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
