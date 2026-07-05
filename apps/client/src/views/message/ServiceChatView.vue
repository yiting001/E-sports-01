<script setup lang="ts">
/**
 * 在线客服聊天页：承载全屏客服面板。
 * 具体会话解析、历史消息、实时收发与媒体发送由 ServiceChatPanel 统一封装，
 * 便于消息页 PC 双栏布局复用同一聊天能力。
 */
import { useRouter } from 'vue-router';
import ServiceChatPanel from '@/components/message/ServiceChatPanel.vue';

const router = useRouter();

function goBack(): void {
  router.back();
}
</script>

<template>
  <ServiceChatPanel
    :auto-start="true"
    :show-back="true"
    @back="goBack"
  />
</template>
