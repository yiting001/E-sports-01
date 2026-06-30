<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  builtinCount: number;
  configurableCount: number;
  permissionCount: number;
}>();

const items = computed(() => [
  { label: '角色总数', value: props.total, helper: '当前权限范围内的角色数' },
  { label: '内置角色', value: props.builtinCount, helper: '平台预置的全局授权角色' },
  { label: '可配置角色', value: props.configurableCount, helper: '支持维护名称与权限范围' },
  { label: '已绑定权限', value: props.permissionCount, helper: '本页角色关联的权限数量' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
