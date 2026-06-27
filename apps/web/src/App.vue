<script setup lang="ts">
import type { RouteLocationNormalizedLoaded } from 'vue-router';
import { onMounted } from 'vue';
import { useBrandingStore } from '@/stores/branding.store';

/** 启动即加载平台品牌（软件名称/图标），并同步浏览器标题与 favicon */
onMounted(() => {
  void useBrandingStore().load();
});

/** 根路由只区分登录页与后台壳，避免后台内部跳转重挂载导航框架 */
function shellRouteKey(route: RouteLocationNormalizedLoaded): string {
  return route.name === 'login' ? 'login' : 'layout';
}
</script>

<template>
  <router-view v-slot="{ Component, route }">
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
