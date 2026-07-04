<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  enabledCount: number;
  productCount: number;
  imageIconCount: number;
}>();

const items = computed(() => [
  {
    label: '分类总数',
    value: props.total,
    helper: '用于 C 端商品一级导航',
  },
  {
    label: '启用分类',
    value: props.enabledCount,
    helper: '启用后前台可见',
  },
  {
    label: '商品归属',
    value: props.productCount,
    helper: '当前分类页商品总量',
  },
  {
    label: '图片图标',
    value: props.imageIconCount,
    helper: '优先展示图片图标',
  },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
