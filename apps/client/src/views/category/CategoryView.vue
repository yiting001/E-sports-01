<script setup lang="ts">
/**
 * 商品分类目录：搜索栏 + 左侧分类索引 + 右侧分组商品入口。
 * 数据继续来自公开分类/商品接口；目录不改变下单、权限和导航边界。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import SelectedBoosterNotice from '@/components/booster/SelectedBoosterNotice.vue';
import AppIcon from '@/components/common/AppIcon.vue';
import CategoryGroupCard from '@/components/category/CategoryGroupCard.vue';
import { commerceApi } from '@/api/commerce.api';
import type { CategoryGroup } from '@/config/category.mock';
import { buildCategoryGroups, filterCategoryGroups } from '@/utils/category-catalog';

const PRODUCT_PAGE_SIZE = 100;

const categories = ref<CategoryPublicView[]>([]);
const products = ref<ProductPublicView[]>([]);
const keyword = ref('');
const activeCategoryId = ref('');
const loading = ref(true);
const loadError = ref(false);
const catalogScroll = ref<HTMLElement | null>(null);
let scrollFrame: number | null = null;

const groups = computed<CategoryGroup[]>(() =>
  buildCategoryGroups(categories.value, products.value),
);

const visibleGroups = computed<CategoryGroup[]>(() =>
  filterCategoryGroups(groups.value, keyword.value),
);

/** 公开商品接口有单页上限，分类目录需要读取全部页，避免静默遗漏商品。 */
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

function syncActiveCategory(): void {
  const firstVisible = visibleGroups.value[0]?.id ?? '';
  if (!visibleGroups.value.some((group) => group.id === activeCategoryId.value)) {
    activeCategoryId.value = firstVisible;
  }
}

function findGroupElement(categoryId: string): HTMLElement | null {
  const container = catalogScroll.value;
  if (!container) {
    return null;
  }
  return [...container.querySelectorAll<HTMLElement>('[data-category-id]')]
    .find((element) => element.dataset.categoryId === categoryId) ?? null;
}

function scrollToCategory(categoryId: string): void {
  activeCategoryId.value = categoryId;
  void nextTick(() => {
    findGroupElement(categoryId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function showAllProducts(categoryId: string): void {
  if (keyword.value) {
    keyword.value = '';
  }
  scrollToCategory(categoryId);
}

function updateActiveFromScroll(): void {
  const container = catalogScroll.value;
  if (!container) {
    return;
  }
  const marker = container.getBoundingClientRect().top + 24;
  let nearest = visibleGroups.value[0]?.id ?? '';
  for (const group of visibleGroups.value) {
    const element = findGroupElement(group.id);
    if (element && element.getBoundingClientRect().top <= marker) {
      nearest = group.id;
    }
  }
  if (nearest) {
    activeCategoryId.value = nearest;
  }
}

function onCatalogScroll(): void {
  if (scrollFrame !== null) {
    return;
  }
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = null;
    updateActiveFromScroll();
  });
}

watch(visibleGroups, syncActiveCategory, { immediate: true });

onMounted(() => {
  void loadCatalog();
});

onBeforeUnmount(() => {
  if (scrollFrame !== null) {
    window.cancelAnimationFrame(scrollFrame);
  }
});
</script>

<template>
  <div class="category">
    <header class="category-head">
      <h1 class="page-title">
        商品分类
      </h1>
      <label class="search-box">
        <AppIcon
          name="search"
          :size="17"
        />
        <input
          v-model="keyword"
          type="search"
          name="category-search"
          autocomplete="off"
          placeholder="搜索商品名称"
          aria-label="搜索商品名称"
        >
        <button
          v-if="keyword"
          type="button"
          class="clear-search"
          aria-label="清除搜索"
          @click="keyword = ''"
        >
          <AppIcon
            name="close"
            :size="15"
          />
        </button>
      </label>
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

    <section
      v-else-if="!groups.length"
      class="catalog-state card"
    >
      <AppIcon
        name="grid"
        :size="28"
      />
      <p>暂无启用分类</p>
    </section>

    <div
      v-else
      class="catalog-layout"
    >
      <aside
        class="category-sidebar"
        aria-label="商品分类"
      >
        <button
          v-for="group in visibleGroups"
          :key="group.id"
          type="button"
          class="category-link"
          :class="{ active: activeCategoryId === group.id }"
          :aria-current="activeCategoryId === group.id ? 'true' : undefined"
          @click="scrollToCategory(group.id)"
        >
          {{ group.title }}
        </button>
        <p
          v-if="!visibleGroups.length"
          class="sidebar-empty"
        >
          无匹配分类
        </p>
      </aside>

      <section
        ref="catalogScroll"
        class="catalog-scroll"
        aria-live="polite"
        @scroll="onCatalogScroll"
      >
        <CategoryGroupCard
          v-for="group in visibleGroups"
          :key="group.id"
          :group="group"
          :data-category-id="group.id"
          @show-all="showAllProducts"
        />
        <p
          v-if="!visibleGroups.length"
          class="empty"
        >
          未找到匹配的商品
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped src="./CategoryView.css"></style>
