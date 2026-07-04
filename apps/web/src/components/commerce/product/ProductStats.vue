<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  onShelfCount: number;
  linkedAgentCount: number;
  soldCount: number;
}>();

const items = computed(() => [
  {
    label: '商品总数',
    value: props.total,
    helper: '当前筛选条件下的商品量',
  },
  {
    label: '当前页上架',
    value: props.onShelfCount,
    helper: '上架商品会在 C 端展示',
  },
  {
    label: '已关联客服',
    value: props.linkedAgentCount,
    helper: '用于售后承接与拉群',
  },
  {
    label: '当前页销量',
    value: props.soldCount,
    helper: '按列表当前页汇总',
  },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
