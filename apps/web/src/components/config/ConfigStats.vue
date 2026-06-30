<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  groupCount: number;
  secretCount: number;
  richTextCount: number;
}>();

const items = computed(() => [
  { label: '配置总数', value: props.total, helper: '当前已登记的运行参数' },
  { label: '覆盖分组', value: props.groupCount, helper: '按业务域聚合配置项' },
  { label: '敏感配置', value: props.secretCount, helper: '列表中默认脱敏展示' },
  { label: '富文本', value: props.richTextCount, helper: '使用富文本编辑器维护' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
