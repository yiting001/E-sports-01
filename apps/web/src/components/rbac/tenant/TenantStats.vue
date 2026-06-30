<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  enabledCount: number;
  normalCount: number;
}>();

const items = computed(() => [
  { label: '租户总数', value: props.total, helper: '当前分页条件下的全量结果' },
  { label: '本页启用', value: props.enabledCount, helper: '可正常登录与访问业务' },
  { label: '普通租户', value: props.normalCount, helper: '排除内置默认租户' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
