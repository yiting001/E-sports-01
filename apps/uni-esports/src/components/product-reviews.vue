<template>
  <view class="card reviews">
    <view class="reviews-head">
      <view class="sec-title">
        <text class="sec-title-text">
          用户评价
        </text>
      </view>
      <text class="reviews-count">
        共 {{ total }} 条
      </text>
      <text
        v-if="avgRating"
        class="reviews-avg"
      >
        ★ {{ avgRating }} 分
      </text>
    </view>

    <text
      v-if="!loading && reviews.length === 0"
      class="reviews-hint"
    >
      暂无评价，下单体验后来评一评吧
    </text>

    <view
      v-for="review in reviews"
      :key="review.id"
      class="review-item"
    >
      <view class="review-avatar">
        <image
          v-if="review.avatar"
          class="review-avatar-img"
          :src="review.avatar"
          mode="aspectFill"
        />
        <text
          v-else
          class="review-avatar-text"
        >
          {{ review.reviewerName.slice(0, 1) || '评' }}
        </text>
      </view>
      <view class="review-body">
        <view class="review-head">
          <text class="review-name">
            {{ review.reviewerName }}
          </text>
          <text class="review-stars">
            {{ stars(review.rating) }}
          </text>
        </view>
        <text class="review-content">
          {{ review.content }}
        </text>
        <text class="review-date">
          {{ formatDateTime(review.createdAt) }}
        </text>
      </view>
    </view>

    <button
      v-if="reviews.length < total"
      class="reviews-more"
      :disabled="loadingMore"
      @tap="loadMore"
    >
      {{ loadingMore ? '加载中…' : '查看更多评价' }}
    </button>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { ReviewPublicView } from '@app/contracts';
import { reviewApi } from '@/api/review.api';
import { formatDateTime } from '@/utils/format';

/**
 * 商品评论区，与 apps/client 的 ProductReviews 同构：
 * 平均分 + 评论总数 + 可见评论分页列表。
 */
const props = defineProps<{
  productId: string;
}>();

const PAGE_SIZE = 5;

const reviews = ref<ReviewPublicView[]>([]);
const avgRating = ref('');
const total = ref(0);
const page = ref(1);
const loading = ref(false);
const loadingMore = ref(false);

onMounted(() => {
  void load();
});

async function load(): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  page.value = 1;
  try {
    const result = await reviewApi.listByProduct(props.productId, 1, PAGE_SIZE);
    reviews.value = result.list;
    avgRating.value = result.avgRating;
    total.value = result.total;
  } catch {
    // 评论区加载失败不阻塞详情页主体
  } finally {
    loading.value = false;
  }
}

async function loadMore(): Promise<void> {
  if (loadingMore.value || reviews.value.length >= total.value) {
    return;
  }
  loadingMore.value = true;
  try {
    const nextPage = page.value + 1;
    const result = await reviewApi.listByProduct(props.productId, nextPage, PAGE_SIZE);
    reviews.value = [...reviews.value, ...result.list];
    avgRating.value = result.avgRating || avgRating.value;
    total.value = result.total;
    page.value = nextPage;
  } catch {
    // 错误已静默，按钮可重试
  } finally {
    loadingMore.value = false;
  }
}

function stars(rating: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(filled) + '☆'.repeat(5 - filled);
}
</script>

<style scoped>
.reviews {
  margin-top: 24rpx;
}

.reviews-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.sec-title {
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.sec-title::before {
  content: '';
  width: 10rpx;
  height: 32rpx;
  background-color: #ffb020;
  transform: skewX(-18deg);
}

.sec-title-text {
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 800;
  font-style: italic;
  letter-spacing: 2rpx;
}

.reviews-count {
  color: #67738c;
  font-size: 24rpx;
}

.reviews-avg {
  margin-left: auto;
  color: #ffb020;
  font-size: 24rpx;
}

.reviews-hint {
  display: block;
  padding: 24rpx 0;
  color: #67738c;
  font-size: 26rpx;
}

.review-item {
  display: flex;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid rgba(150, 165, 195, 0.1);
}

.review-item:last-of-type {
  border-bottom: none;
}

.review-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background-color: rgba(255, 176, 32, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.review-avatar-img {
  width: 64rpx;
  height: 64rpx;
}

.review-avatar-text {
  color: #ffb020;
  font-size: 28rpx;
  font-weight: 700;
}

.review-body {
  flex: 1;
  min-width: 0;
}

.review-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.review-name {
  color: #e9eef6;
  font-size: 26rpx;
  font-weight: 600;
}

.review-stars {
  color: #ffb020;
  font-size: 22rpx;
  letter-spacing: 4rpx;
}

.review-content {
  display: block;
  margin-top: 8rpx;
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.6;
}

.review-date {
  display: block;
  margin-top: 8rpx;
  color: #67738c;
  font-size: 22rpx;
}

.reviews-more {
  width: 100%;
  height: 72rpx;
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffb020;
  font-size: 26rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.reviews-more[disabled] {
  opacity: 0.55;
}
</style>
