<template>
  <view
    v-if="open && notice"
    class="popup"
    @tap="close"
  >
    <view
      class="popup-panel"
      @tap.stop
    >
      <text class="type-label popup-kicker">
        平台公告
      </text>
      <text class="type-title popup-title">
        {{ notice.title }}
      </text>
      <scroll-view
        scroll-y
        class="popup-body"
        :show-scrollbar="false"
      >
        <rich-text
          v-if="contentHtml"
          class="popup-content"
          :nodes="contentHtml"
        />
        <text
          v-else
          class="type-small text-muted"
        >
          该公告暂无正文
        </text>
      </scroll-view>
      <view class="popup-actions">
        <text
          class="btn-text popup-action"
          @tap="goDetail"
        >
          查看详情
        </text>
        <text
          class="btn-text popup-action popup-action--primary"
          @tap="close"
        >
          我知道了
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { noticeApi } from '@/api/notice.api';
import { STORAGE_KEYS } from '@/config/env';
import { tenantContext } from '@/tenant/tenant-context';
import type { NoticePopupView } from '@/types/notice';
import { sanitizeRichHtml } from '@/utils/rich-text';

/**
 * 弹窗公告（居中弹窗，首页首屏挂载）。
 * 进入应用拉取本租户最新一条弹窗公告；关闭后按「公告 id + 更新时间」记在本机，
 * 同一条不再重复弹出，后台更新内容或换新公告则重新弹出；接口失败静默降级。
 * 注意：居中弹窗，不是底部弹层；层级高于 H5 的 uni-tabbar，避免被标签栏遮挡。
 */

const notice = ref<NoticePopupView | null>(null);
const open = ref(false);

const contentHtml = computed(() => sanitizeRichHtml(notice.value?.content ?? ''));

/** 已读版本存储键（按租户隔离，避免同机多租户入口串号） */
function seenKey(): string {
  return `${STORAGE_KEYS.noticePopupSeen}.${tenantContext.getCode()}`;
}

function versionOf(view: NoticePopupView): string {
  return `${view.id}:${view.updatedAt}`;
}

function readSeenVersion(): string {
  const value = uni.getStorageSync(seenKey());
  return typeof value === 'string' ? value : '';
}

function writeSeenVersion(version: string): void {
  uni.setStorageSync(seenKey(), version);
}

function close(): void {
  if (notice.value) {
    writeSeenVersion(versionOf(notice.value));
  }
  open.value = false;
}

/** 查看详情：先记已读关闭，再进入公告详情页 */
function goDetail(): void {
  const id = notice.value?.id;
  if (!id) {
    return;
  }
  close();
  uni.navigateTo({ url: `/pages/notice/detail?id=${id}` });
}

/** 首页 onShow 调用：仅首次（无已读版本或版本变化）弹出 */
async function load(): Promise<void> {
  try {
    const view = await noticeApi.popup();
    if (!view || readSeenVersion() === versionOf(view)) {
      return;
    }
    notice.value = view;
    open.value = true;
  } catch {
    // 弹窗公告失败不打扰主流程
  }
}

defineExpose({ load });
</script>

<style scoped>
/* 居中弹窗：遮罩 + 面板，层级高于 H5 标签栏（998）与底部弹层 */
.popup {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 56rpx;
  background-color: rgba(0, 0, 0, 0.78);
}

/* Alert 级容器：Dark Surface + 极细描边 + 16px 圆角，零阴影 */
.popup-panel {
  width: 100%;
  max-width: 620rpx;
  max-height: 74vh;
  display: flex;
  flex-direction: column;
  padding: 48rpx 40rpx 32rpx;
  background-color: var(--c-surface);
  border: 1rpx solid var(--c-border);
  border-radius: var(--radius-lg);
  box-sizing: border-box;
}

.popup-kicker {
  color: var(--c-text-secondary);
}

.popup-title {
  display: block;
  margin-top: 16rpx;
  color: var(--c-text);
}

.popup-body {
  max-height: 46vh;
  margin-top: 28rpx;
}

.popup-content {
  display: block;
  color: var(--c-text-secondary);
  font-size: 26rpx;
  line-height: 1.75;
  word-break: break-word;
}

.popup-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 40rpx;
  padding-top: 28rpx;
  border-top: 1rpx solid var(--c-border);
}

.popup-action {
  margin-left: 40rpx;
  color: var(--c-text-secondary);
}

.popup-action--primary {
  color: var(--c-text);
}
</style>
