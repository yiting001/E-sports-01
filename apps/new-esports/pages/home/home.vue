<template>
  <view class="home">
    <!-- 首屏：满幅影像（无配置时退回纯文字首屏），文字压在影像上，界面退后 -->
    <view class="hero">
      <swiper
        v-if="bannerImages.length > 0"
        class="hero-swiper"
        :circular="bannerImages.length > 1"
        :autoplay="bannerImages.length > 1"
        :interval="bannerIntervalMs"
        :duration="600"
        :indicator-dots="bannerImages.length > 1"
        indicator-color="rgba(255, 255, 255, 0.35)"
        indicator-active-color="#ffffff"
      >
        <swiper-item
          v-for="(image, index) in bannerImages"
          :key="index"
        >
          <image
            class="hero-image"
            :src="image"
            mode="aspectFill"
          />
        </swiper-item>
      </swiper>
      <view class="hero-scrim" />
      <view class="hero-overlay">
        <text class="type-display hero-title">
          {{ appName }}
        </text>
        <text class="type-label hero-meta">
          {{ heroMeta }}
        </text>
      </view>
    </view>

    <view class="content">
      <!-- 公告：细线上一行轮播，点击展开通知正文 -->
      <view
        v-if="notices.length > 0"
        class="notice"
        @tap="openNotices"
      >
        <text class="type-label notice-label">
          公告
        </text>
        <swiper
          class="notice-swiper"
          vertical
          autoplay
          circular
          :interval="4000"
          :duration="500"
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
        <text class="notice-more">
          ›
        </text>
      </view>

      <!-- 搜索：服务端关键字过滤，回车生效 -->
      <view class="search">
        <input
          v-model="keywordInput"
          class="input search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索服务 / 单子"
          placeholder-class="placeholder"
          @confirm="applySearch"
        >
        <text
          class="btn-text search-action"
          @tap="applySearch"
        >
          搜索
        </text>
      </view>
      <view
        v-if="appliedKeyword"
        class="search-active"
      >
        <text class="type-small text-muted">
          搜索：{{ appliedKeyword }}
        </text>
        <text
          class="btn-text search-clear"
          @tap="clearSearch"
        >
          清除
        </text>
      </view>

      <!-- 分类签：全部 + 启用中分类，单选即按分类重新拉取 -->
      <scroll-view
        scroll-x
        class="chips"
        :show-scrollbar="false"
      >
        <view
          class="chip"
          :class="{ 'chip--active': activeCategoryId === '' }"
          @tap="selectCategory('')"
        >
          <text class="chip-text">
            全部
          </text>
        </view>
        <view
          v-for="category in categories"
          :key="category.id"
          class="chip"
          :class="{ 'chip--active': category.id === activeCategoryId }"
          @tap="selectCategory(category.id)"
        >
          <text class="chip-text">
            {{ category.name }}
          </text>
        </view>
      </scroll-view>

      <!-- 商品：双列影像网格，触底加载更多 -->
      <view
        v-if="products.length > 0"
        class="grid"
      >
        <product-card
          v-for="product in products"
          :key="product.id"
          :product="product"
          @tap="openProduct(product)"
        />
      </view>
      <view
        v-else-if="!loading"
        class="empty"
      >
        {{ appliedKeyword ? '没有匹配的服务，换个关键词试试' : '暂无上架服务' }}
      </view>

      <view
        v-if="loadingMore"
        class="grid-foot type-label"
      >
        加载中
      </view>
      <view
        v-else-if="products.length > 0 && !hasMore"
        class="grid-foot type-label"
      >
        已展示全部
      </view>
    </view>

    <notice-popup ref="noticePopupRef" />
  </view>
</template>

<script setup lang="ts">
import { onPullDownRefresh, onReachBottom, onShareAppMessage, onShow } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { commerceApi } from '@/api/commerce.api';
import { noticeApi } from '@/api/notice.api';
import noticePopup from '@/components/notice-popup.vue';
import productCard from '@/components/product-card.vue';
import { branding } from '@/stores/branding';
import type { CategoryPublicView, ProductPublicView } from '@/types/commerce';
import type { NoticePublicView, PortalBannerView } from '@/types/notice';
import { resolveMediaUrl } from '@/utils/media-url';

/**
 * 首页：满幅影像首屏 → 公告 → 分类签 → 双列商品网格。
 * 分类与商品来自后端公开接口；关键字与分类过滤都走服务端，避免前端分页与筛选不一致。
 */

const PAGE_SIZE = 10;
const DEFAULT_BANNER_INTERVAL_MS = 3000;

const { appName } = branding;

const banner = ref<PortalBannerView>({ items: [], intervalSeconds: 0 });
const notices = ref<NoticePublicView[]>([]);
const categories = ref<CategoryPublicView[]>([]);
const products = ref<ProductPublicView[]>([]);
const total = ref(0);
const activeCategoryId = ref('');
const keywordInput = ref('');
const appliedKeyword = ref('');
/** 下一次触底要请求的页码（第 1 页由首屏/筛选逻辑直接请求，避免重复拉取） */
const nextPage = ref(2);
const hasMore = ref(true);
const loading = ref(false);
const loadingMore = ref(false);
const initialized = ref(false);
/** 弹窗公告组件引用：首屏加载后触发一次（组件内部按已读版本决定是否弹出） */
const noticePopupRef = ref<{ load: () => Promise<void> } | null>(null);

/** 横幅图片统一改写地址并剔除空值 */
const bannerImages = computed(() =>
  banner.value.items.map((item) => resolveMediaUrl(item.image)).filter((url) => Boolean(url)),
);

const bannerIntervalMs = computed(() =>
  Math.max(1, Math.min(3, banner.value.intervalSeconds)) * 1000 || DEFAULT_BANNER_INTERVAL_MS,
);

/** 首屏标签：当前筛选条件与在售数量（数据驱动，不写营销文案） */
const heroMeta = computed(() => {
  const scope =
    categories.value.find((category) => category.id === activeCategoryId.value)?.name ??
    (appliedKeyword.value ? `搜索 ${appliedKeyword.value}` : '全部服务');
  return total.value > 0 ? `${scope} · ${total.value} 项` : scope;
});

onShareAppMessage(() => ({
  title: appName.value,
  path: '/pages/home/home',
}));

onShow(() => {
  if (!initialized.value) {
    initialized.value = true;
    void refresh().then(() => noticePopupRef.value?.load());
  }
});

/** 首屏一次性拉齐：横幅、公告、分类、商品首页 */
async function refresh(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    const [bannerView, noticeList, categoryList, productPage] = await Promise.all([
      noticeApi.getBanner(),
      noticeApi.list(),
      commerceApi.listCategories(),
      commerceApi.listProducts({
        page: 1,
        pageSize: PAGE_SIZE,
        categoryId: activeCategoryId.value || undefined,
        keyword: appliedKeyword.value || undefined,
      }),
    ]);
    banner.value = bannerView;
    notices.value = noticeList;
    categories.value = categoryList;
    products.value = productPage.list;
    nextPage.value = 2;
    total.value = productPage.total;
    hasMore.value = productPage.list.length < productPage.total;
  } catch {
    // 接口错误已统一 toast，首页保底展示空态
  } finally {
    loading.value = false;
  }
}

/** 按当前筛选条件重新拉取商品（分类切换 / 搜索生效 / 清除搜索共用） */
async function reloadProducts(): Promise<void> {
  loadingMore.value = true;
  try {
    const result = await commerceApi.listProducts({
      page: 1,
      pageSize: PAGE_SIZE,
      categoryId: activeCategoryId.value || undefined,
      keyword: appliedKeyword.value || undefined,
    });
    products.value = result.list;
    nextPage.value = 2;
    total.value = result.total;
    hasMore.value = result.list.length < result.total;
  } catch {
    // 接口错误已统一 toast
  } finally {
    loadingMore.value = false;
  }
}

function selectCategory(categoryId: string): void {
  if (activeCategoryId.value === categoryId) {
    return;
  }
  activeCategoryId.value = categoryId;
  products.value = [];
  void reloadProducts();
}

function applySearch(): void {
  const keyword = keywordInput.value.trim();
  if (keyword === appliedKeyword.value) {
    return;
  }
  appliedKeyword.value = keyword;
  products.value = [];
  void reloadProducts();
}

function clearSearch(): void {
  keywordInput.value = '';
  if (!appliedKeyword.value) {
    return;
  }
  appliedKeyword.value = '';
  products.value = [];
  void reloadProducts();
}

/** 触底加载下一页（服务端分页，追加展示） */
async function loadMore(): Promise<void> {
  if (loading.value || loadingMore.value || !hasMore.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const result = await commerceApi.listProducts({
      page: nextPage.value,
      pageSize: PAGE_SIZE,
      categoryId: activeCategoryId.value || undefined,
      keyword: appliedKeyword.value || undefined,
    });
    products.value = [...products.value, ...result.list];
    nextPage.value += 1;
    total.value = result.total;
    hasMore.value = products.value.length < result.total;
  } catch {
    // 接口错误已统一 toast
  } finally {
    loadingMore.value = false;
  }
}

onReachBottom(() => {
  void loadMore();
});

/** 公告条点击：仅一条通知时直达详情，多条进入通知列表页 */
function openNotices(): void {
  const only = notices.value.length === 1 ? notices.value[0] : null;
  uni.navigateTo({
    url: only ? `/pages/notice/detail?id=${only.id}` : '/pages/notice/list',
  });
}

onPullDownRefresh(async () => {
  await refresh();
  uni.stopPullDownRefresh();
});

/** 进入商品详情页 */
function openProduct(product: ProductPublicView): void {
  uni.navigateTo({ url: `/pages/product/detail?id=${product.id}` });
}
</script>

<style scoped>
.home {
  padding-bottom: 24rpx;
}

/* ===== 首屏：满幅影像 + 文字遮罩 ===== */
.hero {
  position: relative;
  width: 100%;
  height: 480rpx;
  background-color: #000000;
  overflow: hidden;
}

.hero-swiper {
  width: 100%;
  height: 480rpx;
}

.hero-image {
  width: 100%;
  height: 480rpx;
  display: block;
}

/* 影像可读性遮罩（Runway 允许的唯一渐变） */
.hero-scrim {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 320rpx;
  background-image: linear-gradient(to top, rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0));
  pointer-events: none;
}

.hero-overlay {
  position: absolute;
  right: 32rpx;
  bottom: 40rpx;
  left: 32rpx;
  pointer-events: none;
}

.hero-title {
  display: block;
  color: var(--c-text);
}

.hero-meta {
  display: block;
  margin-top: 16rpx;
  color: rgba(255, 255, 255, 0.72);
}

/* ===== 内容区 ===== */
.content {
  padding: 32rpx 32rpx 64rpx;
}

.notice {
  display: flex;
  align-items: center;
  height: 72rpx;
  border-top: 1rpx solid var(--c-border);
  border-bottom: 1rpx solid var(--c-border);
}

.notice-label {
  flex-shrink: 0;
  color: var(--c-text);
}

.notice-swiper {
  flex: 1;
  height: 72rpx;
  margin: 0 16rpx;
}

.notice-title {
  display: block;
  height: 72rpx;
  line-height: 72rpx;
  color: var(--c-text-secondary);
  font-size: 24rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notice-more {
  flex-shrink: 0;
  color: var(--c-text-tertiary);
  font-size: 32rpx;
}

.search {
  display: flex;
  align-items: center;
  margin-top: 32rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
}

.search-action {
  margin-left: 24rpx;
  color: var(--c-text);
}

.search-active {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16rpx;
}

.search-clear {
  color: var(--c-text-secondary);
}

/* ===== 分类签：无填充，仅白字 + 细下划线表示选中 ===== */
.chips {
  margin-top: 32rpx;
  white-space: nowrap;
}

.chip {
  display: inline-block;
  margin-right: 40rpx;
  padding-bottom: 12rpx;
  border-bottom: 2rpx solid transparent;
}

.chip--active {
  border-bottom-color: var(--c-text);
}

.chip-text {
  color: var(--c-text-secondary);
  font-size: 26rpx;
  letter-spacing: 0.35px;
}

.chip--active .chip-text {
  color: var(--c-text);
}

/* ===== 商品网格 ===== */
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 32rpx 24rpx;
  margin-top: 40rpx;
}

.grid-foot {
  padding: 40rpx 0 8rpx;
  text-align: center;
}
</style>
