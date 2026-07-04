<script setup lang="ts">
/**
 * 通知列表页（全屏）：展示启用中的平台通知，点击进入详情页。
 * 首页公告条点击进入。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { NoticePublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { noticeApi } from '@/api/notice.api';
import { formatNoticeDate } from './notice-format';

const router = useRouter();
const list = ref<NoticePublicView[]>([]);
const loading = ref(true);

async function load(): Promise<void> {
  loading.value = true;
  try {
    list.value = await noticeApi.list();
  } finally {
    loading.value = false;
  }
}

function open(item: NoticePublicView): void {
  router.push({ name: 'notice-detail', params: { id: item.id } });
}

onMounted(load);
</script>

<template>
  <div class="notice-page">
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
        <span class="name">平台通知</span>
        <span class="tip">最新公告与活动动态</span>
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
        v-else-if="!list.length"
        class="hint"
      >
        暂无通知
      </p>
      <button
        v-for="item in list"
        v-else
        :key="item.id"
        class="item card"
        @click="open(item)"
      >
        <AppIcon
          name="horn"
          :size="16"
          class="horn"
        />
        <span class="item-body">
          <span class="item-title">{{ item.title }}</span>
          <span class="item-time">{{ formatNoticeDate(item.createdAt) }}</span>
        </span>
        <AppIcon
          name="chevron"
          :size="16"
          class="arrow"
        />
      </button>
    </div>
  </div>
</template>

<style scoped>
.notice-page {
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

.bar-title {
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
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint {
  text-align: center;
  font-size: 13px;
  color: var(--c-text-secondary);
  padding: 24px 0;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
}

.horn {
  flex-shrink: 0;
  color: var(--c-accent);
}

.item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.arrow {
  flex-shrink: 0;
  color: var(--c-text-secondary);
}
</style>
