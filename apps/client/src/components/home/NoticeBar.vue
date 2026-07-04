<script setup lang="ts">
/**
 * 滚动公告条：喇叭图标 + 无缝横向滚动文案，点击进入平台通知列表页。
 * 文案取启用中的通知标题拼接；后台未发布通知时回退默认文案。
 * 文案复制两份首尾相接，CSS 动画平移 -50% 实现无缝循环，无需 JS 计算宽度。
 */
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { NoticePublicView } from '@app/contracts';
import AppIcon from '@/components/common/AppIcon.vue';
import { HOME_NOTICE } from '@/config/home.mock';
import { noticeApi } from '@/api/notice.api';

const router = useRouter();
const notices = ref<NoticePublicView[]>([]);

/** 滚动文案：多条通知标题以分隔符拼接；无通知时回退默认文案 */
const text = computed(() =>
  notices.value.length
    ? notices.value.map((n) => n.title).join('　·　')
    : HOME_NOTICE,
);

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
      <div class="track">
        <span class="text">{{ text }}</span>
        <span class="text">{{ text }}</span>
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
  overflow: hidden;
  white-space: nowrap;
}

.track {
  display: inline-flex;
  animation: scroll 16s linear infinite;
}

.text {
  padding-right: 48px;
  font-size: 13px;
  color: var(--c-text-secondary);
}

.arrow {
  flex-shrink: 0;
  color: var(--c-text-secondary);
}

@keyframes scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
