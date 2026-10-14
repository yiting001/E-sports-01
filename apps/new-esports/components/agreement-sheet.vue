<template>
  <sheet
    :open="open"
    title="用户协议与隐私政策"
    @close="emit('close')"
  >
    <view
      v-if="loading"
      class="agreement-hint type-small text-muted"
    >
      加载中…
    </view>
    <rich-text
      v-else-if="contentHtml"
      class="agreement-content"
      :nodes="contentHtml"
    />
    <view
      v-else
      class="agreement-hint type-small text-muted"
    >
      平台暂未配置协议正文，如需了解用户协议与隐私政策请联系客服。
    </view>
  </sheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { configApi } from '@/api/config.api';
import { sanitizeRichHtml } from '@/utils/rich-text';
import sheet from './sheet.vue';

/**
 * 用户协议弹层（登录页与个人页共用）。
 * 首次打开时惰性拉取后台配置的协议正文并净化缓存，后续打开直接复用；
 * 未配置正文时展示兜底说明（当前租户即为未配置状态）。
 */
const props = defineProps<{ open: boolean }>();

const emit = defineEmits<{ close: [] }>();

const loading = ref(false);
const loaded = ref(false);
const contentHtml = ref('');

watch(
  () => props.open,
  async (open) => {
    if (!open || loaded.value || loading.value) {
      return;
    }
    loading.value = true;
    try {
      const { contentHtml: html } = await configApi.agreement();
      contentHtml.value = sanitizeRichHtml(html);
      loaded.value = true;
    } catch {
      // 接口错误已统一提示，本次不缓存，允许下次重试
    } finally {
      loading.value = false;
    }
  },
);
</script>

<style scoped>
.agreement-hint {
  padding: 16rpx 0;
}

.agreement-content {
  display: block;
  color: var(--c-text-secondary);
  font-size: 26rpx;
  line-height: 1.75;
}
</style>
