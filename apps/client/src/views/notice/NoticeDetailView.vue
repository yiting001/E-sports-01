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
  <div class="notice-detail client-page">
    <header class="bar">
      <div class="bar-inner">
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
          <span class="tip">平台公告与服务更新</span>
        </div>
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
        <header class="article-head">
          <span class="badge">
            <AppIcon
              name="horn"
              :size="15"
            />
            平台通知
          </span>
          <h1 class="title">
            {{ notice.title }}
          </h1>
          <p class="time">
            发布时间：{{ formatNoticeDate(notice.createdAt) }}
          </p>
        </header>
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

.bar-inner {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  color: var(--c-text);
  transform: rotate(180deg);
}

.bar-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.name {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.tip {
  font-size: 12px;
  color: var(--c-accent);
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
  padding: 18px 16px 20px;
}

.article-head {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--c-border);
}

.badge {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  margin-bottom: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--c-accent);
  background: var(--c-accent-dim);
}

.title {
  font-size: 20px;
  font-weight: 800;
  color: var(--c-text);
  line-height: 1.45;
}

.time {
  margin-top: 8px;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.content {
  margin-top: 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--c-text);
  word-break: break-word;
}

.content :deep(p),
.content :deep(ul),
.content :deep(ol),
.content :deep(blockquote) {
  margin: 0 0 12px;
}

.content :deep(img),
.content :deep(video) {
  max-width: 100%;
  border-radius: var(--radius-sm);
}

@media (min-width: 768px) {
  .notice-detail.notice-detail.notice-detail > .scroll.scroll {
    max-width: 860px;
  }

  .body {
    padding: 28px 30px 32px;
  }

  .title {
    font-size: 26px;
    line-height: 1.35;
  }

  .time {
    font-size: 13px;
  }

  .content {
    margin-top: 22px;
    font-size: 15px;
    line-height: 1.9;
  }
}
</style>
