<script setup lang="ts">
/**
 * 首次进入弹窗公告（C 端 · 全站布局挂载）。
 * 进入应用时拉取本租户最新一条弹窗公告，DOMPurify 消毒后渲染富文本；
 * 关闭后按「公告 id + 更新时间」记在本机，同一条公告不再重复弹出，
 * 后台更新内容或换新公告则重新弹出。接口失败静默降级，不打扰主流程。
 */
import DOMPurify from 'dompurify';
import { computed, onMounted, ref } from 'vue';
import type { NoticePopupView } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import { resolveTenantCode } from '@/utils/tenant';
import { formatNoticeDate } from '@/views/notice/notice-format';

/** 已读弹窗公告的本机存储键（按租户隔离，避免同域多租户入口串号） */
const SEEN_KEY_PREFIX = 'client.notice.popup.seen.';

const notice = ref<NoticePopupView | null>(null);
const open = ref(false);

const safeContent = computed(() =>
  notice.value ? DOMPurify.sanitize(notice.value.content) : '',
);

/** 弹窗版本号：内容更新后重新对已关闭过的用户弹出 */
function versionOf(view: NoticePopupView): string {
  return `${view.id}:${view.updatedAt}`;
}

async function loadPopup(): Promise<void> {
  const tenantCode = resolveTenantCode();
  let view: NoticePopupView | null = null;
  try {
    view = await noticeApi.popup(tenantCode);
  } catch {
    return;
  }
  if (!view || localStorage.getItem(SEEN_KEY_PREFIX + tenantCode) === versionOf(view)) {
    return;
  }
  notice.value = view;
  open.value = true;
}

function close(): void {
  if (notice.value) {
    localStorage.setItem(
      SEEN_KEY_PREFIX + resolveTenantCode(),
      versionOf(notice.value),
    );
  }
  open.value = false;
}

onMounted(loadPopup);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && notice"
      class="popup-mask"
      @click.self="close"
    >
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
            @click="close"
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
            class="popup-confirm"
            @click="close"
          >
            我知道了
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.popup-mask {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: rgb(0 0 0 / 60%);
}

.popup-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  max-height: 76vh;
  overflow: hidden;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--chamfer);
}

.popup-head {
  display: flex;
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
  padding: 12px 16px;
  border-top: 1px solid var(--c-border);
}

.popup-confirm {
  width: 100%;
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
    max-width: 560px;
    box-shadow: 0 18px 48px rgb(0 0 0 / 35%);
  }
}
</style>
