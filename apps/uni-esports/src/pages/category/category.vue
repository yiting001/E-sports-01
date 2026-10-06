<template>
  <view class="category">
    <scroll-view
      scroll-y
      class="cat-side"
    >
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="cat-item"
        :class="{ active: cat.id === activeId }"
        @tap="selectCategory(cat.id)"
      >
        <text
          class="cat-item-text"
          :class="{ 'cat-item-text-active': cat.id === activeId }"
        >
          {{ cat.name }}
        </text>
      </view>
      <empty-state
        v-if="!loading && categories.length === 0"
        text="暂无分类"
      />
    </scroll-view>

    <scroll-view
      scroll-y
      class="cat-main"
      :scroll-top="mainScrollTop"
      :scroll-with-animation="true"
      @scrolltolower="loadMore"
    >
      <view
        v-if="activeCategory"
        class="cat-head"
      >
        <text class="cat-head-name">
          {{ activeCategory.name }}
        </text>
        <text
          v-if="activeCategory.cover"
          class="cat-head-cover"
        >
          {{ activeCategory.cover }}
        </text>
      </view>
      <view class="cat-goods">
        <goods-card
          v-for="product in products"
          :key="product.id"
          :product="product"
          @tap="gotoProduct(product.id)"
        />
      </view>
      <empty-state
        v-if="!loading && products.length === 0"
        text="该分类暂无商品"
      />
      <view
        v-if="loadingMore"
        class="loading-more"
      >
        <text class="text-muted">
          加载中…
        </text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import type { CategoryPublicView, ProductPublicView } from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import goodsCard from '@/components/goods-card.vue';
import emptyState from '@/components/empty-state.vue';

const PAGE_SIZE = 10;

const categories = ref<CategoryPublicView[]>([]);
const activeId = ref('');
const products = ref<ProductPublicView[]>([]);
const page = ref(1);
const total = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const mainScrollTop = ref(0);

const activeCategory = computed(() =>
  categories.value.find((cat) => cat.id === activeId.value),
);

onShareAppMessage(() => ({
  title: '全部服务',
  path: '/pages/category/category',
}));

onShow(() => {
  void refresh();
});

async function refresh(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    categories.value = await commerceApi.listCategories();
    if (categories.value.length > 0) {
      const keepActive = categories.value.some((cat) => cat.id === activeId.value);
      const nextId = keepActive ? activeId.value : categories.value[0].id;
      activeId.value = nextId;
      await reloadProducts();
    } else {
      activeId.value = '';
      products.value = [];
    }
  } catch {
    // 错误已统一提示
  } finally {
    loading.value = false;
  }
}

async function reloadProducts(): Promise<void> {
  page.value = 1;
  const result = await commerceApi.listProducts({
    page: 1,
    pageSize: PAGE_SIZE,
    categoryId: activeId.value,
  });
  products.value = result.list;
  total.value = result.total;
}

function selectCategory(categoryId: string): void {
  if (categoryId === activeId.value) {
    return;
  }
  activeId.value = categoryId;
  products.value = [];
  mainScrollTop.value = mainScrollTop.value === 0 ? 1 : 0;
  void reloadProducts().catch(() => undefined);
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || products.value.length >= total.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const result = await commerceApi.listProducts({
      page: nextPage,
      pageSize: PAGE_SIZE,
      categoryId: activeId.value,
    });
    products.value = [...products.value, ...result.list];
    page.value = nextPage;
    total.value = result.total;
  } catch {
    // 错误已统一提示
  } finally {
    loadingMore.value = false;
  }
}

function gotoProduct(productId: string): void {
  uni.navigateTo({ url: `/pages/product/detail?id=${productId}` });
}
</script>

<style scoped>
.category {
  display: flex;
  height: 100vh;
}

.cat-side {
  width: 180rpx;
  height: 100%;
  background-color: #0e1220;
  border-right: 1rpx solid rgba(150, 165, 195, 0.12);
  flex-shrink: 0;
}

.cat-item {
  padding: 28rpx 20rpx;
  border-left: 6rpx solid transparent;
}

.cat-item.active {
  border-left-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.08);
}

.cat-item-text {
  color: #9aa6bb;
  font-size: 26rpx;
}

.cat-item-text-active {
  color: #ffb020;
  font-weight: 600;
}

.cat-main {
  flex: 1;
  height: 100%;
}

.cat-head {
  padding: 24rpx;
}

.cat-head-name {
  display: block;
  color: #e9eef6;
  font-size: 32rpx;
  font-weight: 700;
}

.cat-head-cover {
  display: block;
  margin-top: 8rpx;
  color: #9aa6bb;
  font-size: 24rpx;
}

.cat-goods {
  padding: 0 24rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.loading-more {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
}
</style>
