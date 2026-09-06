<script setup lang="ts">
/**
 * 首次进入弹窗公告（C 端 · 全站布局挂载）。
 * 进入应用时拉取本租户最新一条弹窗公告，DOMPurify 消毒后渲染富文本；
 * 关闭后按「公告 id + 更新时间」记在本机，同一条公告不再重复弹出，
 * 后台更新内容或换新公告则重新弹出。接口失败静默降级，不打扰主流程。
 * 弹窗面板为固定尺寸，公告内容在正文区内部滚动，不随内容撑大或缩小。
 */
import DOMPurify from 'dompurify';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { NoticePopupView } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import FlameWrap from '@/components/canvasui/FlameWrap.vue';
import { tenantContext } from '@/tenant/tenant-context';
import { formatNoticeDate } from '@/views/notice/notice-format';

/** 已读弹窗公告的本机存储键（按租户隔离，避免同域多租户入口串号） */
const SEEN_KEY_PREFIX = "client.notice.popup.seen.";

const router = useRouter();
const notice = ref<NoticePopupView | null>(null);
const open = ref(false);
const popupTenantCode = ref("");

const safeContent = computed(() =>
  notice.value ? DOMPurify.sanitize(notice.value.content) : ""
);

/** 弹窗版本号：内容更新后重新对已关闭过的用户弹出 */
function versionOf(view: NoticePopupView): string {
  return `${view.id}:${view.updatedAt}`;
}

function readSeenVersion(tenantCode: string): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY_PREFIX + tenantCode);
  } catch {
    return null;
  }
}

function writeSeenVersion(tenantCode: string, version: string): void {
  try {
    window.localStorage.setItem(SEEN_KEY_PREFIX + tenantCode, version);
  } catch {
    // Storage 不可用时仅退化为下次进入再次展示。
  }
}

async function loadPopup(): Promise<void> {
  const tenantCode = tenantContext.getCode();
  let view: NoticePopupView | null = null;
  try {
    view = await noticeApi.popup();
  } catch {
    return;
  }
  if (!view || readSeenVersion(tenantCode) === versionOf(view)) {
    return;
  }
  notice.value = view;
  popupTenantCode.value = tenantCode;
  open.value = true;
}

function close(): void {
  if (notice.value && popupTenantCode.value) {
    writeSeenVersion(popupTenantCode.value, versionOf(notice.value));
  }
  open.value = false;
}

/** 点击查看详情：记已读关闭弹窗后进入公告详情页 */
function goDetail(): void {
  if (!notice.value) {
    return;
  }
  const id = notice.value.id;
  close();
  void router.push({ name: 'notice-detail', params: { id } });
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
      <FlameWrap
        class="popup-flame"
        :color="[1, 0.28, 0.03]"
        :height="86"
        :spread="14"
        :radius="12"
        :speed="0.35"
        :scale="0.68"
        :turbulence="0.42"
        :turbulence-scale="0.7"
        :turbulence-reach="18"
        :sparks="0.75"
        :spark-size="0.3"
        :spark-density="0.8"
        :spark-speed="0.8"
        :rim="1.6"
        :melt="4"
        :distortion="6"
        :smoke="0.75"
        :ember="0.9"
        :scorch="0.45"
      >
        <div
          class="popup-panel"
          role="dialog"
          aria-modal="true"
        >
          <header class="popup-head">
            <div class="popup-title">
              <span class="popup-name">{{ notice.title }}</span>
              <span class="popup-time">{{
                formatNoticeDate(notice.createdAt)
              }}</span>
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
              class="popup-detail"
              @click="goDetail"
            >
              查看详情
            </button>
            <button
              class="popup-confirm"
              @click="close"
            >
              我知道了
            </button>
          </footer>
        </div>
      </FlameWrap>
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
  height: 100%;
  overflow: hidden;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--chamfer);
}

.popup-flame {
  width: 100%;
  max-width: 480px;
  height: min(72vh, 560px);
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
  .popup-flame {
    max-width: 560px;
    height: min(76vh, 640px);
  }

  .popup-flame .popup-panel {
    box-shadow: 0 18px 48px rgb(0 0 0 / 35%);
  }
}
</style>
