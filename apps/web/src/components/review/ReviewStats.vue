<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  visibleCount: number;
  hiddenCount: number;
}>();

const items = computed(() => [
  { label: '评论记录', value: props.total, helper: '当前筛选条件下的评论总数' },
  { label: '展示中', value: props.visibleCount, helper: '本页对外可见的评论' },
  { label: '已隐藏', value: props.hiddenCount, helper: '本页被隐藏的违规评论' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
