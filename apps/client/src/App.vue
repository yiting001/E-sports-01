<script setup lang="ts">
/**
 * 根组件：仅承载路由出口与全局轻提示。
 */
import AppToast from '@/components/common/AppToast.vue';
</script>

<template>
  <router-view />
  <AppToast />
</template>
