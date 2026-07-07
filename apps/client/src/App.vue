<script setup lang="ts">
/**
 * 根组件：承载路由出口与全局轻提示；
 * 启动即加载平台品牌（软件名称/图标，配置中心与管理端共用），同步浏览器标题与 favicon。
 */
import { onMounted } from 'vue';
import AppToast from '@/components/common/AppToast.vue';
import { useBrandingStore } from '@/stores/branding.store';

onMounted(() => {
  void useBrandingStore().load();
});
</script>

<template>
  <router-view />
  <AppToast />
</template>
