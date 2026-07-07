<script setup lang="ts">
/**
 * 滚动公告条：喇叭图标 + 竖向逐条轮播文案，点击进入平台通知列表页。
 * 文案取启用中的通知标题；后台未发布通知时回退默认文案。
 * 多条通知时克隆首条到末尾，过渡结束后无动画复位，实现连续向上轮播。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { NoticePublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { HOME_NOTICE } from '@/config/home.mock';
import { noticeApi } from '@/api/notice.api';

const router = useRouter();
const notices = ref<NoticePublicView[]>([]);
const activeIndex = ref(0);
const transitionEnabled = ref(true);
let timer: ReturnType<typeof setInterval> | null = null;

interface NoticeTickerItem {
  id?: string;
  title: string;
}

/** 轮播条目：有公告展示公告标题，无公告时展示默认文案 */
const tickerItems = computed<NoticeTickerItem[]>(() =>
  notices.value.length
    ? notices.value.map((notice) => ({ id: notice.id, title: notice.title }))
    : [{ title: HOME_NOTICE }],
);

/** 多条时追加首条副本，让最后一条继续向上切到第一条 */
const loopItems = computed(() =>
  tickerItems.value.length > 1 ? [...tickerItems.value, tickerItems.value[0]] : tickerItems.value,
);

const shouldLoop = computed(() => tickerItems.value.length > 1);
const trackStyle = computed(() => ({
  transform: `translateY(-${activeIndex.value * 100}%)`,
}));

function stopTicker(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTicker(): void {
  stopTicker();
  activeIndex.value = 0;
  transitionEnabled.value = true;
  if (!shouldLoop.value) {
    return;
  }
  timer = setInterval(() => {
    transitionEnabled.value = true;
    activeIndex.value += 1;
  }, 3200);
}

function onTrackTransitionEnd(): void {
  if (!shouldLoop.value || activeIndex.value < tickerItems.value.length) {
    return;
  }
  transitionEnabled.value = false;
  activeIndex.value = 0;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      transitionEnabled.value = true;
    });
  });
}

function open(): void {
  if (notices.value.length === 1) {
    router.push({ name: 'notice-detail', params: { id: notices.value[0].id } });
    return;
  }
  router.push({ name: 'notices' });
}

onMounted(async () => {
  try {
    notices.value = await noticeApi.list();
  } catch {
    // 拉取失败时静默回退默认文案，不阻断首页渲染
  }
});

watch(tickerItems, startTicker, { immediate: true });
onUnmounted(stopTicker);
</script>

<template>
  <button
    class="notice card"
    @click="open"
  >
    <AppIcon
      name="horn"
      :size="16"
      class="horn"
    />
    <div class="marquee no-scrollbar">
      <div
        class="track"
        :class="{ 'track--resetting': !transitionEnabled }"
        :style="trackStyle"
        @transitionend="onTrackTransitionEnd"
      >
        <span
          v-for="(item, index) in loopItems"
          :key="`${item.id ?? 'fallback'}-${index}`"
          class="item"
        >
          <span class="text">{{ item.title }}</span>
        </span>
      </div>
    </div>
    <AppIcon
      name="chevron"
      :size="14"
      class="arrow"
    />
  </button>
</template>

<style scoped>
.notice {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  text-align: left;
}

.horn {
  flex-shrink: 0;
  color: var(--c-accent);
}

.marquee {
  flex: 1;
  height: 20px;
  overflow: hidden;
  white-space: nowrap;
}

.track {
  display: flex;
  width: 100%;
  flex-direction: column;
  transition: transform 0.35s ease;
}

.track--resetting {
  transition: none;
}

.item {
  height: 20px;
  display: flex;
  align-items: center;
  min-width: 0;
}

.text {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  color: var(--c-text-secondary);
  text-overflow: ellipsis;
}

.arrow {
  flex-shrink: 0;
  color: var(--c-text-secondary);
}
</style>
