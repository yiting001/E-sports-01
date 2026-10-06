<template>
  <view class="notice-detail">
    <view
      v-if="notice"
      class="card"
    >
      <text class="title">
        {{ notice.title }}
      </text>
      <text class="time">
        {{ formatDateTime(notice.createdAt) }}
      </text>
      <view class="divider" />
      <rich-text
        class="content"
        :nodes="notice.content"
      />
    </view>
    <empty-state
      v-else-if="!loading"
      text="通知不存在或已下架"
    />
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { NoticePublicView } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import emptyState from '@/components/empty-state.vue';
import { formatDateTime } from '@/utils/format';

const notice = ref<NoticePublicView | null>(null);
const loading = ref(true);

onShareAppMessage(() => ({
  title: notice.value?.title ?? '平台通知',
  path: '/pages/notice/list',
}));

onLoad(async (options) => {
  const id = options?.id ?? '';
  if (!id) {
    loading.value = false;
    return;
  }
  try {
    notice.value = await noticeApi.detail(id);
    if (notice.value?.title) {
      uni.setNavigationBarTitle({ title: notice.value.title });
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
  min-height: 100vh;
  padding: 24rpx;
}

.title {
  display: block;
  color: #e9eef6;
  font-size: 36rpx;
  font-weight: 700;
  line-height: 1.4;
}

.time {
  display: block;
  margin-top: 12rpx;
  color: #67738c;
  font-size: 22rpx;
}

.divider {
  height: 1rpx;
  background-color: rgba(150, 165, 195, 0.16);
  margin: 24rpx 0;
}

.content {
  color: #9aa6bb;
  font-size: 28rpx;
  line-height: 1.7;
}
</style>
