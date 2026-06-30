<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  enabledCount: number;
  phoneBoundCount: number;
  assignedCount: number;
}>();

const items = computed(() => [
  { label: '用户总数', value: props.total, helper: '当前权限范围内的账号数' },
  { label: '本页启用', value: props.enabledCount, helper: '可正常登录与访问系统' },
  { label: '绑定手机', value: props.phoneBoundCount, helper: '支持短信验证码登录' },
  { label: '已分配角色', value: props.assignedCount, helper: '至少绑定一个角色' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
