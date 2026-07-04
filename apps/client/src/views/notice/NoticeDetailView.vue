<script setup lang="ts">
/**
 * 通知详情页（全屏）：展示单条通知的富文本内容。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DOMPurify from 'dompurify';
import type { NoticePublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { noticeApi } from '@/api/notice.api';
import { formatNoticeDate } from './notice-format';

const route = useRoute();
const router = useRouter();
const notice = ref<NoticePublicView | null>(null);
const loading = ref(true);
const missing = ref(false);

const safeContent = computed(() =>
  notice.value ? DOMPurify.sanitize(notice.value.content) : '',
);

async function load(): Promise<void> {
  loading.value = true;
  try {
    notice.value = await noticeApi.detail(String(route.params.id));
  } catch {
    missing.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="notice-detail">
    <header class="bar">
      <button
        class="back"
        aria-label="返回"
        @click="router.back()"
      >
        <AppIcon
          name="chevron"
          :size="20"
        />
      </button>
      <div class="bar-title">
        <span class="name">通知详情</span>
      </div>
    </header>

    <div class="scroll">
      <p
        v-if="loading"
        class="hint"
      >
        加载中…
      </p>
      <p
        v-else-if="missing || !notice"
        class="hint"
      >
        通知不存在或已下线
      </p>
      <article
        v-else
        class="card body"
      >
        <h1 class="title">
          {{ notice.title }}
        </h1>
        <p class="time">
          {{ formatNoticeDate(notice.createdAt) }}
        </p>
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="content"
          v-html="safeContent"
        />
        <!-- eslint-enable vue/no-v-html -->
      </article>
    </div>
  </div>
</template>

<style scoped>
.notice-detail {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 36% at 50% 0%, rgba(255, 176, 32, 0.07), transparent 70%),
    var(--c-bg);
}

.bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.body {
  padding: 18px 16px;
}

.title {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-text);
  line-height: 1.4;
}

.time {
  margin-top: 6px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.content {
  margin-top: 14px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--c-text);
  word-break: break-word;
}

.content :deep(img),
.content :deep(video) {
  max-width: 100%;
  border-radius: var(--radius-sm);
}
</style>
