<script setup lang="ts">
/**
 * 商品评论区（商品详情页）：展示平均分、评论总数与可见评论分页列表，
 * 数据自加载（传入 productId 即可），到底部可加载更多。
 */
import { onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  type ReviewPublicView,
} from '@app/contracts';
import RatingStars from '@/components/review/RatingStars.vue';
import { reviewApi } from '@/api/review.api';

const props = defineProps<{ productId: string }>();

const reviews = ref<ReviewPublicView[]>([]);
const total = ref(0);
const avgRating = ref('');
const page = ref(1);
const loading = ref(false);

function formatTime(iso: string): string {
  return iso ? iso.slice(0, 10) : '';
}

async function load(reset = false): Promise<void> {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    if (reset) {
      page.value = 1;
    }
    const result = await reviewApi.listByProduct(
      props.productId,
      page.value,
      PAGINATION_DEFAULTS.pageSize,
    );
    reviews.value = reset ? result.list : [...reviews.value, ...result.list];
    total.value = result.total;
    avgRating.value = result.avgRating;
  } finally {
    loading.value = false;
  }
}

function loadMore(): void {
  if (reviews.value.length >= total.value) {
    return;
  }
  page.value += 1;
  void load();
}

onMounted(() => void load(true));
</script>

<template>
  <section class="card reviews">
    <div class="head">
      <h2 class="sec-title">
        用户评价
      </h2>
      <span class="count">共 {{ total }} 条</span>
      <span
        v-if="avgRating"
        class="avg"
      >
        <RatingStars :model-value="Math.round(Number(avgRating))" />
        {{ avgRating }} 分
      </span>
    </div>

    <p
      v-if="!loading && reviews.length === 0"
      class="hint"
    >
      暂无评价，下单体验后来评一评吧
    </p>

    <article
      v-for="review in reviews"
      :key="review.id"
      class="review"
    >
      <div class="review-head">
        <img
          v-if="review.avatar"
          :src="review.avatar"
          alt=""
          class="avatar"
        >
        <span
          v-else
          class="avatar avatar--fallback"
        >
          {{ review.reviewerName.slice(0, 1) }}
        </span>
        <span class="reviewer">{{ review.reviewerName }}</span>
        <RatingStars
          :model-value="review.rating"
          :size="14"
        />
        <span class="time">{{ formatTime(review.createdAt) }}</span>
      </div>
      <p class="content">
        {{ review.content }}
      </p>
    </article>

    <button
      v-if="reviews.length < total"
      class="more"
      :disabled="loading"
      @click="loadMore"
    >
      {{ loading ? '加载中…' : '加载更多' }}
    </button>
  </section>
</template>

<style scoped>
.reviews {
  padding: 14px 16px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sec-title {
  font-size: 14px;
  font-weight: 800;
  font-style: italic;
}

.count {
  font-size: 12px;
  color: var(--c-text-muted);
}

.avg {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-num);
  font-size: 13px;
  font-weight: 800;
  color: var(--c-accent);
}

.hint {
  padding: 18px 0;
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.review {
  padding: 12px 0;
  border-top: 1px solid var(--c-border);
}

.review:first-of-type {
  margin-top: 10px;
}

.review-head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  flex: none;
}

.avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-text-secondary);
  background: var(--c-border);
}

.reviewer {
  font-size: 13px;
  font-weight: 700;
}

.time {
  margin-left: auto;
  font-size: 11px;
  color: var(--c-text-muted);
}

.content {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text-secondary);
  word-break: break-word;
}

.more {
  display: block;
  margin: 10px auto 0;
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
