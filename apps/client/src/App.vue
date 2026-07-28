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
import { useConversationEventsStore } from '@/stores/conversation-events.store';
import { useHallBadgeStore } from '@/stores/hall-badge.store';
import { usePortalStore } from '@/stores/portal.store';
import { useUnreadStore } from '@/stores/unread.store';
import { TenantEntryStatus, tenantContext } from '@/tenant/tenant-context';

const router = useRouter();
const invalidTenantEntry = tenantContext.entryError;
const tenantEntryStatus = tenantContext.entryStatus;
const auth = useAuthStore();
const branding = useBrandingStore();
const portal = usePortalStore();
const unread = useUnreadStore();
const conversationEvents = useConversationEventsStore();
const badges = [unread, useHallBadgeStore()];
const presence = createPresenceSocket({
  onConversationChanged: (conversation) => {
    conversationEvents.publish(conversation);
    void unread.refresh();
  },
  onUnreadChanged: () => void unread.refresh(),
});

/** 租户切换后重新读取站点配置；store 内部会丢弃上一租户的晚到响应。 */
const stopTenantConfigWatch = watch(
  () => [tenantContext.code.value, tenantContext.revision.value] as const,
  () => {
    if (invalidTenantEntry.value) {
      return;
    }
    void branding.load();
    void portal.load();
  },
  { immediate: true },
);

/** 登录/登出时同步在线连接；首次打开时也按本地令牌立即建立。 */
const stopPresenceWatch = watch(
  [() => auth.isAuthenticated, () => tenantContext.entryStatus.value],
  ([authenticated, status]) => {
    if (authenticated && status === TenantEntryStatus.Ready) {
      presence.connect();
      badges.forEach((badge) => void badge.refresh());
    } else {
      presence.disconnect();
      conversationEvents.clear();
      badges.forEach((badge) => badge.setTotal(0));
    }
  },
  { immediate: true },
);

/** 路由切换后刷新角标（如离开聊天页时已读位点已更新、接单后大厅数量变化） */
const removeAfterEach = router.afterEach(() => {
  if (tenantContext.entryStatus.value === TenantEntryStatus.Ready) {
    badges.forEach((badge) => void badge.refresh());
  }
});

/** 从后台恢复页面时刷新，作为断线或浏览器节流期间的兜底。 */
function refreshVisibleBadges(): void {
  if (document.visibilityState === 'visible') {
    if (tenantContext.entryStatus.value !== TenantEntryStatus.Ready) {
      return;
    }
    badges.forEach((badge) => void badge.refresh());
  }
}

let appMounted = false;
const stopTenantStatusWatch = watch(
  () => tenantContext.entryStatus.value,
  (status) => {
    if (!appMounted) {
      return;
    }
    if (status === TenantEntryStatus.Ready) {
      badges.forEach((badge) => badge.startPolling());
    } else {
      badges.forEach((badge) => {
        badge.stopPolling();
        badge.setTotal(0);
      });
    }
  }
);

onMounted(() => {
  appMounted = true;
  if (tenantContext.entryStatus.value === TenantEntryStatus.Ready) {
    badges.forEach((badge) => badge.startPolling());
  }
  document.addEventListener('visibilitychange', refreshVisibleBadges);
});

onBeforeUnmount(() => {
  appMounted = false;
  removeAfterEach();
  stopPresenceWatch();
  stopTenantConfigWatch();
  stopTenantStatusWatch();
  presence.dispose();
  badges.forEach((badge) => badge.stopPolling());
  document.removeEventListener('visibilitychange', refreshVisibleBadges);
});
</script>

<template>
  <main
    v-if="tenantEntryStatus === TenantEntryStatus.Validating"
    class="tenant-entry-state"
    role="status"
  >
    <span
      class="tenant-entry-spinner"
      aria-hidden="true"
    />
    <p>正在加载站点...</p>
  </main>
  <main
    v-else-if="tenantEntryStatus === TenantEntryStatus.Rejected"
    class="tenant-entry-error"
    role="alert"
  >
    <h1>租户不可用</h1>
    <p>{{ invalidTenantEntry }}</p>
  </main>
  <template v-else>
    <router-view />
    <AppToast />
  </template>
</template>

<style scoped>
.tenant-entry-error,
.tenant-entry-state {
  display: grid;
  min-height: 100vh;
  padding: 24px;
  place-content: center;
  text-align: center;
  background: #f5f6f8;
  color: #1f2937;
}

.tenant-entry-error h1 {
  margin: 0 0 12px;
  font-size: 24px;
  letter-spacing: 0;
}

.tenant-entry-error p,
.tenant-entry-state p {
  margin: 0;
  color: #6b7280;
  line-height: 1.6;
}

.tenant-entry-spinner {
  width: 28px;
  height: 28px;
  margin: 0 auto 12px;
  border: 3px solid #d1d5db;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: tenant-entry-spin 0.8s linear infinite;
}

@keyframes tenant-entry-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tenant-entry-spinner {
    animation: none;
  }
}
</style>
