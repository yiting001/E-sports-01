<script setup lang="ts">
/**
 * 滚动公告条：喇叭图标 + 无缝横向滚动文案。
 * 文案复制两份首尾相接，CSS 动画平移 -50% 实现无缝循环，无需 JS 计算宽度。
 */
import AppIcon from '@/components/common/AppIcon.vue';
import { HOME_NOTICE } from '@/config/home.mock';
</script>

<template>
  <div class="notice card">
    <AppIcon
      name="horn"
      :size="16"
      class="horn"
    />
    <div class="marquee no-scrollbar">
      <div class="track">
        <span class="text">{{ HOME_NOTICE }}</span>
        <span class="text">{{ HOME_NOTICE }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
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

@keyframes scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}
</style>
