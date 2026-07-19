<script setup lang="ts">
/**
 * 分类页（全部游戏）：顶部标题/分段页签 + 综合分类目录 / 商品销量榜。
 * 分类名称由管理端维护，商品明细来自公开接口；桌面综合双列、榜单单列，移动统一单列。
 */
import { computed, onMounted, ref } from 'vue';
import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import SelectedBoosterNotice from '@/components/booster/SelectedBoosterNotice.vue';
import CategoryGroupCard from '@/components/category/CategoryGroupCard.vue';
import RankItemCard from '@/components/category/RankItemCard.vue';
import SegmentTabs from '@/components/common/SegmentTabs.vue';
import type { CategoryGroup, RankItem } from '@/config/category.mock';
import { commerceApi } from '@/api/commerce.api';

/** 页签文案（下标与 activeTab 对应） */
const TABS = ['综合', '排行榜'];
const PRODUCT_PAGE_SIZE = 100;
const activeTab = ref(0);

const categories = ref<CategoryPublicView[]>([]);
const products = ref<ProductPublicView[]>([]);
const loading = ref(true);
const loadError = ref(false);

/** 综合：按分类聚合商品为分组网格，展示全部启用分类（暂无商品的分类也保留占位） */
const groups = computed<CategoryGroup[]>(() =>
  categories.value.map((category) => ({
    id: category.id,
    title: category.name,
    icon: category.icon,
    iconText: category.cover,
    items: products.value.filter((product) => product.categoryId === category.id),
  })),
);

/** 排行榜：按销量降序，热度以榜首为 100 基准 */
const ranks = computed<RankItem[]>(() => {
  const sorted = [...products.value].sort((a, b) => b.sold - a.sold).slice(0, 10);
  const top = sorted[0]?.sold ?? 0;
  return sorted.map((product) => ({
    product,
    heat: top > 0 ? Math.round((product.sold / top) * 100) : 0,
  }));
});

/** 公开商品接口有单页上限，分类目录需要读取全部页，避免第 101 件起静默缺失。 */
async function listAllProducts(): Promise<ProductPublicView[]> {
  const firstPage = await commerceApi.listProducts({ page: 1, pageSize: PRODUCT_PAGE_SIZE });
  const productsById = new Map(firstPage.list.map((product) => [product.id, product]));
  const totalPages = Math.ceil(firstPage.total / PRODUCT_PAGE_SIZE);

  for (let page = 2; page <= totalPages; page += 1) {
    const nextPage = await commerceApi.listProducts({ page, pageSize: PRODUCT_PAGE_SIZE });
    if (!nextPage.list.length) {
      break;
    }
    nextPage.list.forEach((product) => productsById.set(product.id, product));
  }

  return [...productsById.values()];
}

async function loadCatalog(): Promise<void> {
  loading.value = true;
  loadError.value = false;
  try {
    const [categoryList, productList] = await Promise.all([
      commerceApi.listCategories(),
      listAllProducts(),
    ]);
    const enabledCategoryIds = new Set(categoryList.map((category) => category.id));
    categories.value = categoryList;
    products.value = productList.filter((product) => enabledCategoryIds.has(product.categoryId));
  } catch {
    categories.value = [];
    products.value = [];
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadCatalog();
});
</script>

<template>
  <div class="category">
    <header class="category-head">
      <h1 class="page-title">
        全部游戏
      </h1>
      <SegmentTabs
        v-model="activeTab"
        :tabs="TABS"
        class="category-tabs"
      />
    </header>

    <SelectedBoosterNotice />

    <section
      v-if="loading"
      class="catalog-state card"
      aria-live="polite"
    >
      <span class="state-loader" />
      <p>分类加载中</p>
    </section>

    <section
      v-else-if="loadError"
      class="catalog-state card"
      role="alert"
    >
      <h2>分类加载失败</h2>
      <p>请检查网络后重新加载。</p>
      <button
        type="button"
        class="retry"
        @click="loadCatalog"
      >
        重新加载
      </button>
    </section>

    <!-- 综合：分类大标题 + 该分类商品明细 -->
    <section
      v-else-if="activeTab === 0"
      class="group-list"
    >
      <CategoryGroupCard
        v-for="group in groups"
        :key="group.id"
        :group="group"
      />
      <p
        v-if="!groups.length"
        class="empty"
      >
        暂无启用分类
      </p>
    </section>

    <!-- 排行榜：热度榜单 -->
    <section
      v-else
      class="rank-list"
    >
      <RankItemCard
        v-for="(item, index) in ranks"
        :key="item.product.id"
        :item="item"
        :index="index"
      />
      <p
        v-if="!ranks.length"
        class="empty"
      >
        暂无上架商品
      </p>
    </section>
  </div>
</template>

<style scoped>
.category {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.group-list,
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.category-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 4px 4px 14px;
  border-bottom: 1px solid var(--c-border);
}

.page-title {
  font-size: 20px;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 0;
}

.category-tabs :deep(.seg-btn) {
  letter-spacing: 0;
}

.empty {
  padding: 44px 16px;
  text-align: center;
  color: var(--c-text-muted);
  font-size: 14px;
}

.catalog-state {
  min-height: 220px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
}

.catalog-state h2 {
  font-size: 17px;
}

.catalog-state p {
  font-size: 13px;
  color: var(--c-text-secondary);
}

.state-loader {
  width: 30px;
  height: 30px;
  border: 2px solid var(--c-border);
  border-top-color: var(--c-accent);
  border-radius: 50%;
  animation: category-spin 0.8s linear infinite;
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

@keyframes category-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 768px) {
  .category {
    gap: 16px;
  }

  .category-head {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    min-height: 56px;
  }

  .category-tabs {
    width: 280px;
    flex-shrink: 0;
  }

  .group-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }

  .rank-list {
    width: 100%;
    max-width: 920px;
    margin: 0 auto;
    gap: 14px;
  }
}
</style>
