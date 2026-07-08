<script setup lang="ts">
/**
 * 根组件：承载路由出口与全局轻提示；
 * 启动即加载平台品牌（软件名称/图标，配置中心与管理端共用），同步浏览器标题与 favicon。
 * 未读消息数启动轮询并在路由切换后刷新，驱动导航「消息」角标。
 */
import { onBeforeUnmount, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AppToast from '@/components/common/AppToast.vue';
import { useBrandingStore } from '@/stores/branding.store';
import { useUnreadStore } from '@/stores/unread.store';

const router = useRouter();
const unread = useUnreadStore();

/** 路由切换后刷新未读数（如离开聊天页时已读位点已更新） */
const removeAfterEach = router.afterEach(() => {
  void unread.refresh();
});

onMounted(() => {
  void useBrandingStore().load();
  unread.startPolling();
});

onBeforeUnmount(() => {
  removeAfterEach();
  unread.stopPolling();
});
</script>

<template>
  <router-view />
  <AppToast />
</template>
