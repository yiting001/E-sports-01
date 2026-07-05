<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  PAGINATION_DEFAULTS,
  REVIEW_LIMITS,
  type AdminReviewView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import ReviewDirectory from '@/components/review/ReviewDirectory.vue';
import ReviewStats from '@/components/review/ReviewStats.vue';
import { reviewApi } from '@/api/review.api';
import './ReviewAdminView.css';

const list = ref<AdminReviewView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const ratingFilter = ref<number | undefined>(undefined);
const visibleFilter = ref<boolean | undefined>(undefined);
const loading = ref(false);

const ratingOptions = [
  { label: '全部星级', value: undefined },
  ...Array.from(
    { length: REVIEW_LIMITS.ratingMax },
    (_, i) => REVIEW_LIMITS.ratingMax - i,
  ).map((rating) => ({ label: `${rating} 星`, value: rating })),
];

const visibleOptions = [
  { label: '全部状态', value: undefined },
  { label: '展示中', value: true },
  { label: '已隐藏', value: false },
];

const visibleCount = computed(
  () => list.value.filter((item) => item.visible).length,
);
const hiddenCount = computed(
  () => list.value.filter((item) => !item.visible).length,
);

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await reviewApi.list(
      page.value,
      pageSize.value,
      ratingFilter.value,
      visibleFilter.value,
    );
    list.value = res.list;
    total.value = res.total;
  } finally {
    loading.value = false;
  }
}

async function changePage(value: number): Promise<void> {
  page.value = value;
  await load();
}

async function changePageSize(value: number): Promise<void> {
  pageSize.value = value;
  page.value = PAGINATION_DEFAULTS.page;
  await load();
}

async function onFilterChange(): Promise<void> {
  page.value = 1;
  await load();
}

async function toggle(row: AdminReviewView): Promise<void> {
  await reviewApi.setVisibility(row.id, { visible: !row.visible });
  ElMessage.success(row.visible ? '评论已隐藏' : '评论已恢复展示');
  await load();
}

async function remove(row: AdminReviewView): Promise<void> {
  await ElMessageBox.confirm(
    `确定删除「${row.nickname || row.username}」对「${row.productTitle}」的评论吗？删除后该订单可重新评价。`,
    '删除评论',
    { type: 'warning' },
  );
  await reviewApi.remove(row.id);
  ElMessage.success('评论已删除');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page review-page">
    <review-stats
      :total="total"
      :visible-count="visibleCount"
      :hidden-count="hiddenCount"
    />
    <review-directory
      v-model:rating-filter="ratingFilter"
      v-model:visible-filter="visibleFilter"
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :rating-options="ratingOptions"
      :visible-options="visibleOptions"
      :format-date="formatDate"
      @filter="onFilterChange"
      @refresh="load"
      @toggle="toggle"
      @remove="remove"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
  </section>
</template>
