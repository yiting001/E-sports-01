<script setup lang="ts">
/**
 * 根组件：承载路由出口与全局轻提示；
 * 启动即加载平台品牌（软件名称/图标，配置中心与管理端共用），同步浏览器标题与 favicon。
 * 导航角标（消息未读数/大厅待接单数）启动轮询并在路由切换后刷新。
 */
import { onBeforeUnmount, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppToast from '@/components/common/AppToast.vue';
import { createPresenceSocket } from '@/composables/use-presence-socket';
import { useAuthStore } from '@/stores/auth.store';
import { useBrandingStore } from '@/stores/branding.store';
import { useHallBadgeStore } from '@/stores/hall-badge.store';
import { usePortalStore } from '@/stores/portal.store';
import { useUnreadStore } from '@/stores/unread.store';

const router = useRouter();
const auth = useAuthStore();
const badges = [useUnreadStore(), useHallBadgeStore()];
const presence = createPresenceSocket();

/** 登录/登出时同步在线连接；首次打开时也按本地令牌立即建立。 */
const stopPresenceWatch = watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      presence.connect();
    } else {
      presence.disconnect();
    }
  },
  { immediate: true },
);

/** 路由切换后刷新角标（如离开聊天页时已读位点已更新、接单后大厅数量变化） */
const removeAfterEach = router.afterEach(() => {
  badges.forEach((badge) => void badge.refresh());
});

onMounted(() => {
  void useBrandingStore().load();
  void usePortalStore().load();
  badges.forEach((badge) => badge.startPolling());
});

onBeforeUnmount(() => {
  removeAfterEach();
  stopPresenceWatch();
  presence.dispose();
  badges.forEach((badge) => badge.stopPolling());
});
</script>

<template>
  <router-view />
  <AppToast />
</template>
