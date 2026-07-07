<script setup lang="ts">
/**
 * 聊天记录搜索弹窗：在当前会话内按内容关键词 + 日期范围分页检索（新→旧）。
 * 关键词与日期均可缺省——只选日期即可按天翻阅当天记录。
 */
import type { ChatMessage } from '@app/contracts';
import { MessageType, PAGINATION_DEFAULTS } from '@app/contracts';
import { ref, watch } from 'vue';
import { Search } from '@element-plus/icons-vue';
import { imApi } from '@/api/im.api';
import { formatImTime, messageTypeLabel } from './im-ui';

const props = defineProps<{
  /** 目标会话 id，为空时弹窗不可用 */
  conversationId: string | null;
}>();

const visible = defineModel<boolean>({ required: true });

const keyword = ref('');
const dateRange = ref<[string, string] | null>(null);
const page = ref<number>(PAGINATION_DEFAULTS.page);
const results = ref<ChatMessage[]>([]);
const total = ref(0);
const loading = ref(false);
const searched = ref(false);

async function search(): Promise<void> {
  if (!props.conversationId || loading.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await imApi.searchMessages({
      conversationId: props.conversationId,
      keyword: keyword.value.trim() || undefined,
      dateFrom: dateRange.value?.[0],
      dateTo: dateRange.value?.[1],
      page: page.value,
      pageSize: PAGINATION_DEFAULTS.pageSize,
    });
    results.value = data.list;
    total.value = data.total;
    searched.value = true;
  } finally {
    loading.value = false;
  }
}

/** 变更条件后从第一页重新检索 */
function searchFromStart(): void {
  page.value = PAGINATION_DEFAULTS.page;
  void search();
}

function changePage(next: number): void {
  page.value = next;
  void search();
}

/** 每次打开弹窗重置搜索条件与结果 */
watch(visible, (open) => {
  if (open) {
    keyword.value = '';
    dateRange.value = null;
    page.value = PAGINATION_DEFAULTS.page;
    results.value = [];
    total.value = 0;
    searched.value = false;
  }
});
</script>

<template>
  <el-dialog
    v-model="visible"
    title="搜索聊天记录"
    width="560px"
  >
    <div class="im-search__filters">
      <el-input
        v-model="keyword"
        placeholder="消息内容关键词（可空）"
        clearable
        @keydown.enter="searchFromStart"
      />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        @change="searchFromStart"
      />
      <el-button
        type="primary"
        :icon="Search"
        :loading="loading"
        @click="searchFromStart"
      >
        搜索
      </el-button>
    </div>

    <el-scrollbar
      v-loading="loading"
      class="im-search__results"
    >
      <div
        v-for="message in results"
        :key="message.id"
        class="im-search__item"
      >
        <div class="im-search__meta">
          <span>{{ message.senderId.slice(0, 8) }}</span>
          <span>{{ messageTypeLabel(message.type) }}</span>
          <time>{{ formatImTime(message.createdAt) }}</time>
        </div>
        <div
          v-if="message.type === MessageType.Text || message.type === MessageType.System"
          class="im-search__content"
        >
          {{ message.content }}
        </div>
        <img
          v-else-if="message.type === MessageType.Image"
          :src="message.content"
          class="im-search__media"
          alt="聊天图片"
        >
        <video
          v-else
          :src="message.content"
          controls
          class="im-search__media"
        />
      </div>
      <el-empty
        v-if="searched && results.length === 0"
        :image-size="80"
        description="没有匹配的聊天记录"
      />
      <p
        v-else-if="!searched"
        class="im-search__hint"
      >
        输入关键词或选择日期范围后搜索
      </p>
    </el-scrollbar>

    <el-pagination
      v-if="total > 0"
      layout="prev, pager, next, total"
      :total="total"
      :current-page="page"
      :page-size="PAGINATION_DEFAULTS.pageSize"
      @current-change="changePage"
    />
  </el-dialog>
</template>

<style scoped>
.im-search__filters {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.im-search__results {
  max-height: 380px;
  min-height: 120px;
}

.im-search__item {
  padding: 10px 4px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.im-search__meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.im-search__content {
  font-size: 14px;
  color: var(--el-text-color-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

.im-search__media {
  max-width: 200px;
  max-height: 140px;
  border-radius: 4px;
}

.im-search__hint {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
