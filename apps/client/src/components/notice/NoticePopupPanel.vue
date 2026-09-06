<script setup lang="ts">
/**
 * 弹窗公告面板（C 端）：标题/时间 + 消毒后的富文本正文 + 查看详情/我知道了。
 * 面板填满父级给定的固定尺寸，正文在中间区域内部滚动；是否包裹火焰特效由父组件决定。
 */
import DOMPurify from 'dompurify';
import { computed } from 'vue';
import type { NoticePopupView } from '@app/contracts';
import { formatNoticeDate } from '@/views/notice/notice-format';

const props = defineProps<{ notice: NoticePopupView }>();
const emit = defineEmits<{ close: []; detail: [] }>();

const safeContent = computed(() => DOMPurify.sanitize(props.notice.content));
</script>

<template>
  <div
    class="popup-panel"
    role="dialog"
    aria-modal="true"
  >
    <header class="popup-head">
      <div class="popup-title">
        <span class="popup-name">{{ notice.title }}</span>
        <span class="popup-time">{{ formatNoticeDate(notice.createdAt) }}</span>
      </div>
      <button
        class="popup-close"
        aria-label="关闭公告"
        @click="emit('close')"
      >
        ✕
      </button>
    </header>
    <div class="popup-body">
      <!-- eslint-disable vue/no-v-html -->
      <div
        class="popup-content"
        v-html="safeContent"
      />
      <!-- eslint-enable vue/no-v-html -->
    </div>
    <footer class="popup-foot">
      <button
        class="popup-detail"
        @click="emit('detail')"
      >
        查看详情
      </button>
      <button
        class="popup-confirm"
        @click="emit('close')"
      >
        我知道了
      </button>
    </footer>
  </div>
</template>

<style scoped>
.popup-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--chamfer);
}

.popup-head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
}

.popup-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.popup-name {
  font-size: 15px;
  font-weight: 600;
  overflow-wrap: break-word;
}

.popup-time {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.popup-close {
  padding: 4px 8px;
  font-size: 14px;
  color: var(--c-text-secondary);
  background: none;
  border: none;
}

.popup-body {
  flex: 1;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}

.popup-content {
  font-size: 13px;
  line-height: 1.8;
  color: var(--c-text-secondary);
  overflow-wrap: break-word;
}

.popup-content :deep(img),
.popup-content :deep(video) {
  max-width: 100%;
}

.popup-foot {
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--c-border);
}

.popup-detail {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-text);
  background: none;
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.popup-confirm {
  flex: 1;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--c-bg);
  background: var(--c-accent);
  border: none;
  border-radius: var(--radius-sm);
}

@media (min-width: 768px) {
  .popup-panel {
    box-shadow: 0 18px 48px rgb(0 0 0 / 35%);
  }
}
</style>
