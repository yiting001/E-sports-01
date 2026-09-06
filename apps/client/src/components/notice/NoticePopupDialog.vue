<script setup lang="ts">
/**
 * 首次进入弹窗公告（C 端 · 全站布局挂载）。
 * 进入应用时拉取本租户最新一条弹窗公告，交由 NoticePopupPanel 消毒渲染富文本；
 * 关闭后按「公告 id + 更新时间」记在本机，同一条公告不再重复弹出，
 * 后台更新内容或换新公告则重新弹出。接口失败静默降级，不打扰主流程。
 * 弹窗外框为固定尺寸，公告内容在正文区内部滚动；是否包裹 Flame Wrap 火焰特效
 * 由后台公告的 popupFlame 决定，有无特效时外框尺寸一致。
 */
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { NoticePopupView } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import FlameWrap from '@/components/canvasui/FlameWrap.vue';
import NoticePopupPanel from '@/components/notice/NoticePopupPanel.vue';
import { tenantContext } from '@/tenant/tenant-context';

/** 已读弹窗公告的本机存储键（按租户隔离，避免同域多租户入口串号） */
const SEEN_KEY_PREFIX = "client.notice.popup.seen.";

const router = useRouter();
const notice = ref<NoticePopupView | null>(null);
const open = ref(false);
const popupTenantCode = ref("");

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
        v-if="notice.popupFlame"
        class="popup-frame"
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
        <NoticePopupPanel
          :notice="notice"
          @close="close"
          @detail="goDetail"
        />
      </FlameWrap>
      <div
        v-else
        class="popup-frame"
      >
        <NoticePopupPanel
          :notice="notice"
          @close="close"
          @detail="goDetail"
        />
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

.popup-frame {
  width: 100%;
  max-width: 480px;
  height: min(72vh, 560px);
}

@media (min-width: 768px) {
  .popup-frame {
    max-width: 560px;
    height: min(76vh, 640px);
  }
}
</style>
