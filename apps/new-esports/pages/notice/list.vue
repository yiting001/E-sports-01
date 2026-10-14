<template>
  <view class="notice-list">
    <view
      v-if="notices.length > 0"
      class="rows"
    >
      <view
        v-for="notice in notices"
        :key="notice.id"
        class="row"
        @tap="openDetail(notice.id)"
      >
        <text class="type-body row-title">
          {{ notice.title }}
        </text>
        <view class="row-foot">
          <text class="type-small text-faint">{{ formatDate(notice.createdAt) }}</text>
          <text class="row-arrow">›</text>
        </view>
      </view>
    </view>
    <text
      v-else-if="!loading"
      class="type-small text-faint empty-hint"
    >
      暂无平台通知
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
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { noticeApi } from '@/api/notice.api';
import type { NoticePublicView } from '@/types/notice';
import { formatDate } from '@/utils/format';

/**
 * 平台通知列表：启用中的通知按后台排序展示，点击进入通知详情页。
 * 首页公告条点击后进入本页（仅一条通知时直达详情页）。
 */

const notices = ref<NoticePublicView[]>([]);
const loading = ref(true);

onLoad(async () => {
  try {
    notices.value = await noticeApi.list();
  } catch {
    notices.value = [];
  } finally {
    loading.value = false;
  }
});

function openDetail(id: string): void {
  uni.navigateTo({ url: `/pages/notice/detail?id=${id}` });
}
</script>

<style scoped>
.notice-list {
  padding: 16rpx 32rpx 64rpx;
  box-sizing: border-box;
}

.rows {
  border-top: 1rpx solid var(--c-border);
}

.row {
  padding: 32rpx 0;
  border-bottom: 1rpx solid var(--c-border);
}

.row-title {
  display: block;
  color: var(--c-text);
}

.row-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12rpx;
}

.row-arrow {
  color: var(--c-text-tertiary);
  font-size: 32rpx;
}

.empty-hint {
  display: block;
  padding: 120rpx 0;
  text-align: center;
}
</style>
