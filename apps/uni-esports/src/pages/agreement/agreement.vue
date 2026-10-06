<template>
  <view class="agreement">
    <view class="card">
      <rich-text
        v-if="contentHtml"
        class="agreement-content"
        :nodes="contentHtml"
      />
      <empty-state
        v-else-if="!loading"
        text="暂未配置协议内容"
      />
      <view
        v-else
        class="agreement-loading"
      >
        <text class="text-muted">
          加载中…
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShareAppMessage } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { configApi } from '@/api/config.api';
import emptyState from '@/components/empty-state.vue';

const contentHtml = ref('');
const loading = ref(true);

onShareAppMessage(() => ({
  title: '平台协议',
  path: '/pages/agreement/agreement',
}));

onLoad(async () => {
  try {
    const agreement = await configApi.agreement();
    contentHtml.value = agreement.contentHtml;
  } catch {
    contentHtml.value = '';
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.agreement {
  min-height: 100vh;
  padding: 24rpx;
}

.agreement-content {
  color: #9aa6bb;
  font-size: 26rpx;
  line-height: 1.8;
}

.agreement-loading {
  padding: 40rpx 0;
  text-align: center;
  font-size: 24rpx;
}
</style>
