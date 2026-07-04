<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
  FEEDBACK_TYPE_TEXT,
  FeedbackStatus,
  FeedbackType,
  PAGINATION_DEFAULTS,
  type FeedbackView,
} from '@app/contracts';
import { ElMessage, ElMessageBox } from 'element-plus';
import FeedbackDirectory from '@/components/feedback/FeedbackDirectory.vue';
import FeedbackStats from '@/components/feedback/FeedbackStats.vue';
import { feedbackApi } from '@/api/feedback.api';
import './FeedbackAdminView.css';
import './FeedbackAdminView.responsive.css';

const list = ref<FeedbackView[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref<number>(PAGINATION_DEFAULTS.pageSize);
const statusFilter = ref<FeedbackStatus | undefined>(undefined);
const typeFilter = ref<FeedbackType | undefined>(undefined);
const loading = ref(false);

const statusMeta: Record<
  FeedbackStatus,
  { text: string; type: 'warning' | 'success' }
> = {
  [FeedbackStatus.Pending]: { text: '待处理', type: 'warning' },
  [FeedbackStatus.Resolved]: { text: '已处理', type: 'success' },
};

const statusOptions = [
  { label: '全部状态', value: undefined },
  { label: '待处理', value: FeedbackStatus.Pending },
  { label: '已处理', value: FeedbackStatus.Resolved },
];

const typeOptions = [
  { label: '全部类型', value: undefined },
  ...Object.values(FeedbackType).map((type) => ({
    label: FEEDBACK_TYPE_TEXT[type],
    value: type,
  })),
];

const pendingCount = computed(
  () => list.value.filter((item) => item.status === FeedbackStatus.Pending).length,
);
const resolvedCount = computed(
  () => list.value.filter((item) => item.status === FeedbackStatus.Resolved).length,
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
    const res = await feedbackApi.list(
      page.value,
      pageSize.value,
      statusFilter.value,
      typeFilter.value,
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

async function handle(row: FeedbackView): Promise<void> {
  const { value } = await ElMessageBox.prompt(
    `请输入对「${row.nickname || row.username}」反馈的处理回复`,
    '处理反馈',
    {
      inputType: 'textarea',
      inputPattern: /\S+/,
      inputErrorMessage: '处理回复不能为空',
    },
  );
  await feedbackApi.handle(row.id, { replyContent: value });
  ElMessage.success('已处理并回复');
  await load();
}

onMounted(() => {
  void load();
});
</script>

<template>
  <section class="admin-page feedback-page">
    <feedback-stats
      :total="total"
      :pending-count="pendingCount"
      :resolved-count="resolvedCount"
    />
    <feedback-directory
      v-model:status-filter="statusFilter"
      v-model:type-filter="typeFilter"
      :list="list"
      :total="total"
      :page="page"
      :page-size="pageSize"
      :loading="loading"
      :status-options="statusOptions"
      :type-options="typeOptions"
      :status-meta="statusMeta"
      :format-date="formatDate"
      @filter="onFilterChange"
      @refresh="load"
      @handle="handle"
      @update:page="changePage"
      @update:page-size="changePageSize"
    />
  </section>
</template>
