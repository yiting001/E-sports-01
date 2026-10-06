<template>
  <view class="home">
    <swiper
      v-if="banner.items.length > 0"
      class="banner"
      circular
      autoplay
      :interval="Math.max(2, banner.intervalSeconds) * 1000"
      :indicator-dots="banner.items.length > 1"
      indicator-color="rgba(233, 238, 246, 0.3)"
      indicator-active-color="#ffb020"
    >
      <swiper-item
        v-for="(item, index) in banner.items"
        :key="index"
      >
        <image
          class="banner-image"
          :src="item.image"
          mode="aspectFill"
        />
      </swiper-item>
    </swiper>

    <view
      v-if="notices.length > 0"
      class="notice-bar card"
      @tap="gotoNotices"
    >
      <text class="notice-tag">
        公告
      </text>
      <swiper
        class="notice-swiper"
        vertical
        autoplay
        circular
        :interval="4000"
        :duration="600"
      >
        <swiper-item
          v-for="notice in notices"
          :key="notice.id"
        >
          <text class="notice-title">
            {{ notice.title }}
          </text>
        </swiper-item>
      </swiper>
      <text class="notice-arrow">
        ›
      </text>
    </view>

    <scroll-view
      scroll-x
      class="cat-chips"
      :show-scrollbar="false"
    >
      <view
        v-for="cat in categories"
        :key="cat.id"
        class="chip cat-chip"
        :class="{ active: cat.id === activeCategoryId }"
        @tap="selectCategory(cat.id)"
      >
        <text class="chip-text">
          {{ cat.name }}
        </text>
      </view>
    </scroll-view>

    <view class="goods-grid">
      <goods-card
        v-for="product in products"
        :key="product.id"
        :product="product"
        @tap="gotoProduct(product.id)"
      />
    </view>
    <empty-state
      v-if="!loading && products.length === 0"
      text="暂无上架商品"
    />

    <view
      v-if="loadingMore"
      class="loading-more"
    >
      <text class="text-muted">
        加载中…
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onReachBottom, onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { CategoryPublicView, PortalBannerView, ProductPublicView } from '@app/contracts';
import { commerceApi } from '@/api/commerce.api';
import { noticeApi } from '@/api/notice.api';
import type { NoticePublicView } from '@app/contracts';
import goodsCard from '@/components/goods-card.vue';
import emptyState from '@/components/empty-state.vue';
import { useBrandingStore } from '@/stores/branding.store';

const PAGE_SIZE = 10;

const branding = useBrandingStore();
const banner = ref<PortalBannerView>({ items: [], intervalSeconds: 5 });
const notices = ref<NoticePublicView[]>([]);
const categories = ref<CategoryPublicView[]>([]);
const activeCategoryId = ref('');
const products = ref<ProductPublicView[]>([]);
const page = ref(1);
const hasMore = ref(true);
const loading = ref(false);
const loadingMore = ref(false);

onShareAppMessage(() => ({
  title: branding.appName,
  path: '/pages/home/home',
}));

onShow(() => {
  void refresh();
});

async function refresh(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  page.value = 1;
  hasMore.value = true;
  try {
    const [bannerView, noticeList, categoryList, productList] = await Promise.all([
      noticeApi.getBanner(),
      noticeApi.list(),
      commerceApi.listCategories(),
      commerceApi.listProducts({ page: 1, pageSize: PAGE_SIZE }),
    ]);
    banner.value = bannerView;
    notices.value = noticeList;
    categories.value = categoryList;
    products.value = productList.list;
    hasMore.value = productList.list.length < productList.total;
  } catch {
    // 接口错误已统一 toast；首页保底展示空态
  } finally {
    loading.value = false;
  }
}

function selectCategory(categoryId: string): void {
  activeCategoryId.value = categoryId;
  page.value = 1;
  hasMore.value = true;
  products.value = [];
  void loadProducts();
}

async function loadProducts(): Promise<void> {
  if (loadingMore.value || !hasMore.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const result = await commerceApi.listProducts({
      page: page.value,
      pageSize: PAGE_SIZE,
      categoryId: activeCategoryId.value || undefined,
    });
    products.value =
      page.value === 1 ? result.list : [...products.value, ...result.list];
    hasMore.value = products.value.length < result.total;
    page.value += 1;
  } catch {
    // 错误已统一提示
  } finally {
    loadingMore.value = false;
  }
}

onReachBottom(() => {
  void loadProducts();
});

function gotoProduct(productId: string): void {
  uni.navigateTo({ url: `/pages/product/detail?id=${productId}` });
}

function gotoNotices(): void {
  uni.navigateTo({ url: '/pages/notice/list' });
}
</script>

<style scoped>
.home {
  padding: 24rpx;
}

.banner {
  height: 280rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 280rpx;
}

.notice-bar {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 18rpx 20rpx;
}

.notice-tag {
  color: #ffb020;
  font-size: 22rpx;
  border: 1rpx solid rgba(255, 176, 32, 0.5);
  border-radius: 6rpx;
  padding: 4rpx 12rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.notice-swiper {
  flex: 1;
  height: 40rpx;
}

.notice-title {
  color: #e9eef6;
  font-size: 26rpx;
  line-height: 40rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.notice-arrow {
  color: #67738c;
  font-size: 32rpx;
  margin-left: 12rpx;
}

.cat-chips {
  white-space: nowrap;
  margin: 24rpx 0;
}

.cat-chip {
  margin-right: 16rpx;
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
}

.loading-more {
  padding: 24rpx 0;
  text-align: center;
  font-size: 24rpx;
}
</style>
