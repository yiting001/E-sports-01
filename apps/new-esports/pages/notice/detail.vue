<template>
  <view class="notice-detail">
    <template v-if="notice">
      <text class="type-headline detail-title">
        {{ notice.title }}
      </text>
      <text class="type-label detail-date">
        {{ formatDate(notice.createdAt) }}
      </text>
      <view class="hairline detail-divider" />
      <rich-text
        v-if="contentHtml"
        class="detail-content"
        :nodes="contentHtml"
      />
      <text
        v-else
        class="type-small text-muted"
      >
        该通知暂无正文
      </text>
    </template>
    <text
      v-else-if="!loading"
      class="type-small text-faint empty-hint"
    >
      通知不存在或已下线
    </text>
    <text
      v-else
      class="type-small text-faint empty-hint"
    >
      加载中…
    </text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { noticeApi } from '@/api/notice.api';
import { branding } from '@/stores/branding';
import type { NoticePublicView } from '@/types/notice';
import { formatDate } from '@/utils/format';
import { sanitizeRichHtml } from '@/utils/rich-text';

/**
 * 平台通知详情：富文本正文（H5 端渲染前净化），标题与发布时间走 Runway 字阶。
 */

const { appName } = branding;

const notice = ref<NoticePublicView | null>(null);
const loading = ref(true);

const contentHtml = computed(() => sanitizeRichHtml(notice.value?.content ?? ''));

onShareAppMessage(() => ({
  title: notice.value?.title ?? appName.value,
  path: '/pages/home/home',
}));

onLoad(async (options?: Record<string, string>) => {
  const id = options?.id ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  try {
    notice.value = await noticeApi.detail(id);
    if (notice.value) {
      uni.setNavigationBarTitle({ title: '平台通知' });
    }
  } catch {
    notice.value = null;
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.notice-detail {
  padding: 40rpx 32rpx 72rpx;
  box-sizing: border-box;
}

.detail-title {
  display: block;
  color: var(--c-text);
}

.detail-date {
  display: block;
  margin-top: 20rpx;
}

.detail-divider {
  margin: 32rpx 0;
}

.detail-content {
  display: block;
  color: var(--c-text-secondary);
  font-size: 27rpx;
  line-height: 1.8;
  word-break: break-word;
}

.empty-hint {
  display: block;
  padding: 120rpx 0;
  text-align: center;
}
</style>
