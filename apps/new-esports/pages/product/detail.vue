<template>
  <view v-if="product" class="detail">
    <!-- 封面：满幅影像，点击可全屏预览 -->
    <image
      v-if="cover"
      class="cover"
      :src="cover"
      mode="aspectFill"
      @tap="previewCover"
    />
    <view
      v-else
      class="cover cover-fallback"
    >
      <text class="cover-initial">
        {{ titleInitial }}
      </text>
    </view>

    <view class="body">
      <text class="type-display title">
        {{ product.title }}
      </text>
      <view class="meta">
        <text class="type-label">{{ product.categoryName }}</text>
        <text class="type-label">已售 {{ product.sold }}</text>
      </view>

      <!-- 两端价格：现价为主，原价划线 + 折扣角标 -->
      <view class="prices">
        <view class="price-cell">
          <view class="price-head">
            <text class="type-label">手机端</text>
            <text
              v-if="phoneDiscount"
              class="type-label price-badge"
            >
              {{ phoneDiscount }}
            </text>
          </view>
          <text class="type-num price-value">
            <text class="price-symbol">¥</text>{{ phonePrice }}
          </text>
          <text
            v-if="product.originPriceFen > product.priceFen"
            class="type-small price-origin"
          >
            原价 ¥{{ phoneOrigin }}
          </text>
        </view>
        <view class="price-cell">
          <view class="price-head">
            <text class="type-label">电脑端</text>
            <text
              v-if="pcDiscount"
              class="type-label price-badge"
            >
              {{ pcDiscount }}
            </text>
          </view>
          <text class="type-num price-value">
            <text class="price-symbol">¥</text>{{ pcPrice }}
          </text>
          <text
            v-if="product.pcOriginPriceFen > product.pcPriceFen"
            class="type-small price-origin"
          >
            原价 ¥{{ pcOrigin }}
          </text>
        </view>
      </view>

      <!-- 主/副标语：商品自身的卖点文案 -->
      <view
        v-if="product.coverTitle || product.coverSub"
        class="intro"
      >
        <text
          v-if="product.coverTitle"
          class="type-headline intro-title"
        >
          {{ product.coverTitle }}
        </text>
        <text
          v-if="product.coverSub"
          class="type-small intro-text"
        >
          {{ product.coverSub }}
        </text>
      </view>

      <view class="assurances">
        <text
          v-for="item in ASSURANCES"
          :key="item"
          class="type-label assurance"
        >
          {{ item }}
        </text>
      </view>

      <!-- 详情富文本：默认收起，展开后完整展示（用硬边界而非渐隐遮罩） -->
      <view
        v-if="description"
        class="section"
      >
        <text class="type-label section-title">
          服务说明
        </text>
        <view
          class="desc"
          :class="{ 'desc--expanded': descExpanded }"
        >
          <rich-text
            class="desc-body"
            :nodes="description"
          />
        </view>
        <text
          class="btn-text desc-toggle"
          @tap="descExpanded = !descExpanded"
        >
          {{ descExpanded ? '收起' : '展开全部' }}
        </text>
      </view>

      <!-- 评论：平均分 + 分页列表，无评论时给出空态 -->
      <view class="section">
        <view class="review-head">
          <text class="type-label section-title">
            用户评价
          </text>
          <text
            v-if="reviewTotal > 0"
            class="type-label"
          >
            {{ avgRating ? `${avgRating} 分 · ` : '' }}{{ reviewTotal }} 条
          </text>
        </view>
        <view
          v-if="reviews.length > 0"
          class="reviews"
        >
          <view
            v-for="review in reviews"
            :key="review.id"
            class="review"
          >
            <view class="review-meta">
              <text class="type-small review-name">
                {{ review.reviewerName }}
              </text>
              <text class="review-stars">
                {{ stars(review.rating) }}
              </text>
            </view>
            <text class="type-small review-content">
              {{ review.content }}
            </text>
            <text class="type-small text-faint review-date">
              {{ formatDateTime(review.createdAt) }}
            </text>
          </view>
          <view
            v-if="reviews.length < reviewTotal"
            class="btn-ghost review-more"
            @tap="loadMoreReviews"
          >
            <text>{{ loadingMoreReviews ? '加载中…' : '加载更多评价' }}</text>
          </view>
        </view>
        <text
          v-else-if="!loadingReviews"
          class="type-small text-faint review-empty"
        >
          暂无评价
        </text>
        <text
          v-else
          class="type-small text-faint review-empty"
        >
          加载中…
        </text>
      </view>
    </view>

    <!-- 底部操作条：价格 + 下单（结算页随下一批页面落地） -->
    <view class="footer">
      <view class="footer-price">
        <text class="type-label">起</text>
        <text class="type-num footer-value">
          {{ lowestPrice }}
        </text>
      </view>
      <view
        class="btn-primary footer-buy"
        @tap="onBuy"
      >
        <text>立即下单</text>
      </view>
    </view>
  </view>

  <view
    v-else-if="!loading"
    class="empty"
  >
    商品不存在或已下架
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { computed, ref } from 'vue';
import { commerceApi } from '@/api/commerce.api';
import { reviewApi } from '@/api/review.api';
import { auth } from '@/stores/auth';
import { branding } from '@/stores/branding';
import type { ProductPublicView } from '@/types/commerce';
import type { ReviewPublicView } from '@/types/review';
import { fenToYuan, formatDateTime, priceDiscountLabel } from '@/utils/format';
import { resolveMediaUrl } from '@/utils/media-url';
import { lowestProductPriceFen } from '@/utils/product-price';
import { sanitizeRichHtml } from '@/utils/rich-text';

/**
 * 商品详情：满幅封面 → 两端价格 → 卖点 → 服务保障 → 富文本说明 → 用户评价。
 * 价格按手机端/电脑端分列展示（下单时按所选服务端结算，结算页随下一批页面落地）。
 */

/** 服务保障条（与 apps/client、apps/uni-esports 同文案） */
const ASSURANCES = ['极速接单', '极速响应', '服务至上', '官方严选'];

const REVIEW_PAGE_SIZE = 5;

const { appName } = branding;

const product = ref<ProductPublicView | null>(null);
const loading = ref(true);
const descExpanded = ref(false);

const reviews = ref<ReviewPublicView[]>([]);
const reviewTotal = ref(0);
const avgRating = ref('');
const reviewPage = ref(1);
const loadingReviews = ref(false);
const loadingMoreReviews = ref(false);

const cover = computed(() => resolveMediaUrl(product.value?.cover ?? ''));
const titleInitial = computed(() => product.value?.title.trim().slice(0, 1) ?? '');
const description = computed(() => sanitizeRichHtml(product.value?.description ?? ''));

const phonePrice = computed(() => fenToYuan(product.value?.priceFen ?? 0));
const phoneOrigin = computed(() => fenToYuan(product.value?.originPriceFen ?? 0));
const pcPrice = computed(() => fenToYuan(product.value?.pcPriceFen ?? 0));
const pcOrigin = computed(() => fenToYuan(product.value?.pcOriginPriceFen ?? 0));
const phoneDiscount = computed(() =>
  product.value ? priceDiscountLabel(product.value.priceFen, product.value.originPriceFen) : '',
);
const pcDiscount = computed(() =>
  product.value
    ? priceDiscountLabel(product.value.pcPriceFen, product.value.pcOriginPriceFen)
    : '',
);

const lowestPrice = computed(() =>
  product.value ? `¥${fenToYuan(lowestProductPriceFen(product.value))}` : '--',
);

/** 星级展示：实心星 + 空心星（不引入装饰色） */
function stars(rating: number): string {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(value)}${'☆'.repeat(5 - value)}`;
}

onShareAppMessage(() => ({
  title: product.value?.title ?? appName.value,
  path: product.value ? `/pages/product/detail?id=${product.value.id}` : '/pages/home/home',
}));

onLoad((options?: Record<string, string>) => {
  const id = options?.id ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  void loadProduct(id);
  void loadReviews(id);
});

async function loadProduct(id: string): Promise<void> {
  try {
    product.value = await commerceApi.getProduct(id);
    uni.setNavigationBarTitle({ title: product.value.title });
  } catch {
    product.value = null;
  } finally {
    loading.value = false;
  }
}

async function loadReviews(id: string): Promise<void> {
  loadingReviews.value = true;
  try {
    const result = await reviewApi.listByProduct(id, 1, REVIEW_PAGE_SIZE);
    reviews.value = result.list;
    reviewTotal.value = result.total;
    avgRating.value = result.avgRating;
    reviewPage.value = 1;
  } catch {
    // 评论区失败不阻塞详情主体
  } finally {
    loadingReviews.value = false;
  }
}

async function loadMoreReviews(): Promise<void> {
  if (loadingMoreReviews.value || !product.value) {
    return;
  }
  loadingMoreReviews.value = true;
  try {
    const nextPage = reviewPage.value + 1;
    const result = await reviewApi.listByProduct(product.value.id, nextPage, REVIEW_PAGE_SIZE);
    reviews.value = [...reviews.value, ...result.list];
    reviewTotal.value = result.total;
    avgRating.value = result.avgRating || avgRating.value;
    reviewPage.value = nextPage;
  } catch {
    // 接口错误已统一提示，按钮可重试
  } finally {
    loadingMoreReviews.value = false;
  }
}

function previewCover(): void {
  if (!cover.value) {
    return;
  }
  uni.previewImage({ urls: [cover.value] });
}

/** 立即下单：未登录先去登录，已登录进入下单页 */
function onBuy(): void {
  if (!auth.isLoggedIn.value) {
    uni.navigateTo({ url: '/pages/login/login' });
    return;
  }
  if (!product.value) {
    return;
  }
  uni.navigateTo({ url: `/pages/order/checkout?productId=${product.value.id}` });
}
</script>

<style scoped>
.detail {
  padding-bottom: 200rpx;
}

/* 封面：满幅、零圆角（影像优先） */
.cover {
  display: block;
  width: 100%;
  height: 560rpx;
  background-color: var(--c-surface);
}

.cover-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-initial {
  color: var(--c-silver);
  font-size: 96rpx;
  letter-spacing: -1.2px;
}

.body {
  padding: 40rpx 32rpx 0;
}

.title {
  color: var(--c-text);
}

.meta {
  display: flex;
  justify-content: space-between;
  margin-top: 20rpx;
}

/* 两端价格：两个极细描边单元格，数字走等宽字阶 */
.prices {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  margin-top: 32rpx;
}

.price-cell {
  padding: 24rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-md);
  background-color: var(--c-surface);
}

.price-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.price-badge {
  padding: 2rpx 10rpx;
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-xs);
  color: var(--c-text);
}

.price-value {
  display: block;
  margin-top: 16rpx;
  color: var(--c-text);
  font-size: 48rpx;
  font-weight: 500;
  line-height: 1;
}

.price-symbol {
  font-size: 26rpx;
  margin-right: 4rpx;
}

.price-origin {
  display: block;
  margin-top: 12rpx;
  color: var(--c-text-tertiary);
  text-decoration: line-through;
}

.intro {
  margin-top: 40rpx;
}

.intro-title {
  display: block;
  color: var(--c-text);
}

.intro-text {
  display: block;
  margin-top: 16rpx;
  color: var(--c-text-secondary);
}

.assurances {
  display: flex;
  margin-top: 40rpx;
  border-top: 1rpx solid var(--c-border);
  border-bottom: 1rpx solid var(--c-border);
}

.assurance {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  color: var(--c-text-muted);
}

/* 区块：以细线分隔，标题走大写标签字阶 */
.section {
  margin-top: 48rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid var(--c-border);
}

.section-title {
  color: var(--c-text);
}

.desc {
  position: relative;
  margin-top: 24rpx;
  max-height: 420rpx;
  overflow: hidden;
}

.desc--expanded {
  max-height: none;
}

.desc-body {
  display: block;
  color: var(--c-text-secondary);
  font-size: 26rpx;
  line-height: 1.75;
  word-break: break-word;
}

.desc-toggle {
  margin-top: 24rpx;
  color: var(--c-text-secondary);
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.reviews {
  margin-top: 8rpx;
}

.review {
  padding: 28rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}

.review-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-name {
  color: var(--c-text);
}

.review-stars {
  color: var(--c-silver);
  font-size: 24rpx;
  letter-spacing: 2rpx;
}

.review-content {
  display: block;
  margin-top: 12rpx;
  color: var(--c-text-secondary);
}

.review-date {
  display: block;
  margin-top: 12rpx;
}

.review-more {
  margin-top: 32rpx;
}

.review-empty {
  display: block;
  padding: 40rpx 0;
  text-align: center;
}

/* 底部操作条：纯黑底 + 顶部细线，让影像与文字保持主导 */
.footer {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background-color: #000000;
  border-top: 1rpx solid var(--c-border);
}

.footer-price {
  display: flex;
  align-items: baseline;
}

.footer-value {
  margin-left: 12rpx;
  color: var(--c-text);
  font-size: 44rpx;
  font-weight: 500;
}

.footer-buy {
  width: 300rpx;
}
</style>
