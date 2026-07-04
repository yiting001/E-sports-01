<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  pendingCount: number;
  resolvedCount: number;
}>();

const items = computed(() => [
  { label: '反馈记录', value: props.total, helper: '当前筛选条件下的反馈总数' },
  { label: '待处理', value: props.pendingCount, helper: '本页需要管理员处理的反馈' },
  { label: '已处理', value: props.resolvedCount, helper: '本页已回复处理的反馈' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
