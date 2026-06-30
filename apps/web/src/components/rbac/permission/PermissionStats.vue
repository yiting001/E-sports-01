<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  namespaceCount: number;
  apiCount: number;
  menuCount: number;
  buttonCount: number;
}>();

const items = computed(() => [
  { label: '权限总数', value: props.total, helper: '当前系统已登记的权限点' },
  { label: '命名空间', value: props.namespaceCount, helper: '按权限码自动归档的分组' },
  { label: '接口权限', value: props.apiCount, helper: '后端路由鉴权使用' },
  {
    label: '前端权限',
    value: props.menuCount + props.buttonCount,
    helper: `菜单 ${props.menuCount} / 按钮 ${props.buttonCount}`,
  },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
