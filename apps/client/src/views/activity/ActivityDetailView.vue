<script setup lang="ts">
/**
 * 活动详情页（全屏）：展示单个活动的封面与富文本内容。
 * 富文本经 DOMPurify 净化后渲染，防 XSS。
 */
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DOMPurify from 'dompurify';
import type { ActivityPublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { activityApi } from '@/api/activity.api';
import { activityDateText } from './activity-format';

const route = useRoute();
const router = useRouter();
const activity = ref<ActivityPublicView | null>(null);
const loading = ref(true);
const missing = ref(false);

const safeContent = computed(() =>
  activity.value ? DOMPurify.sanitize(activity.value.content) : '',
);

onMounted(async () => {
  try {
    activity.value = await activityApi.detail(String(route.params.id));
  } catch {
    missing.value = true;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="activity-detail client-page">
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
          <span class="name">活动详情</span>
          <span class="tip">平台活动与福利动态</span>
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
        v-else-if="missing || !activity"
        class="hint"
      >
        活动不存在或已结束
      </p>
      <article
        v-else
        class="card body"
      >
        <div
          v-if="activity.cover"
          class="cover"
          :style="{ backgroundImage: `url(${activity.cover})` }"
        />
        <div class="inner">
          <header class="article-head">
            <span class="badge">
              <AppIcon
                name="gift"
                :size="15"
              />
              活动中心
            </span>
            <h1 class="title">
              {{ activity.title }}
            </h1>
            <p class="time">
              活动时间：{{ activityDateText(activity.startAt) }} ~ {{ activityDateText(activity.endAt) }}
            </p>
          </header>
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="content"
            v-html="safeContent"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.activity-detail {
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
  overflow: hidden;
}

.cover {
  width: 100%;
  height: 168px;
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--c-border);
}

.inner {
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
  .activity-detail.activity-detail.activity-detail > .scroll.scroll {
    max-width: 860px;
  }

  .cover {
    height: 260px;
  }

  .inner {
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
