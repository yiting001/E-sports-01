<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { onBeforeUnmount, watch } from 'vue';
import { useBrandingStore } from '@/stores/branding.store';
import { TenantEntryStatus, tenantContext } from '@/tenant/tenant-context';

const invalidTenantEntry = tenantContext.entryError;
const tenantEntryStatus = tenantContext.entryStatus;

/** 启动及租户切换时加载当前站点品牌，并同步浏览器标题与 favicon。 */
const stopTenantBrandingWatch = watch(
  () => [tenantContext.code.value, tenantContext.revision.value] as const,
  () => {
    if (invalidTenantEntry.value) {
      return;
    }
    void useBrandingStore().load();
  },
  { immediate: true }
);

onBeforeUnmount(stopTenantBrandingWatch);

/** 根路由只区分登录页与后台壳，避免后台内部跳转重挂载导航框架 */
function shellRouteKey(route: RouteLocationNormalizedLoaded): string {
  return route.name === 'login' ? 'login' : 'layout';
}
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
  <router-view
    v-else
    v-slot="{ Component, route }"
  >
    <transition
      name="route-shell"
      mode="out-in"
      appear
    >
      <component
        :is="Component"
        :key="shellRouteKey(route)"
      />
    </transition>
  </router-view>
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
