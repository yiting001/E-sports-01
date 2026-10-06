<template>
  <view class="notices">
    <view
      v-for="notice in notices"
      :key="notice.id"
      class="card notice-item"
      @tap="gotoDetail(notice.id)"
    >
      <text class="notice-item-title">
        {{ notice.title }}
      </text>
      <text class="notice-item-time">
        {{ formatDateTime(notice.createdAt) }}
      </text>
    </view>
    <empty-state
      v-if="!loading && notices.length === 0"
      text="暂无平台通知"
    />
  </view>
</template>

<script setup lang="ts">
import { onShow, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import type { NoticePublicView } from '@app/contracts';
import { noticeApi } from '@/api/notice.api';
import emptyState from '@/components/empty-state.vue';
import { formatDateTime } from '@/utils/format';

const notices = ref<NoticePublicView[]>([]);
const loading = ref(false);

onShareAppMessage(() => ({
  title: '平台通知',
  path: '/pages/notice/list',
}));

onShow(async () => {
  if (loading.value) {
    return;
  }
  loading.value = true;
  try {
    notices.value = await noticeApi.list();
  } catch {
    // 错误已统一提示
  } finally {
    loading.value = false;
  }
});

function gotoDetail(id: string): void {
  uni.navigateTo({ url: `/pages/notice/detail?id=${id}` });
}
</script>

<style scoped>
.notices {
  min-height: 100vh;
  padding: 24rpx;
}

.notice-item {
  margin-bottom: 20rpx;
}

.notice-item-title {
  display: block;
  color: #e9eef6;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1.4;
}

.notice-item-time {
  display: block;
  margin-top: 12rpx;
  color: #67738c;
  font-size: 22rpx;
}
</style>
