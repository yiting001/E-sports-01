<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  total: number;
  pendingCount: number;
  approvedCount: number;
  requiredRoleCount: number;
}>();

const items = computed(() => [
  { label: '审核记录', value: props.total, helper: '当前筛选条件下的实名申请' },
  { label: '待审核', value: props.pendingCount, helper: '需要管理员处理的申请' },
  { label: '已通过', value: props.approvedCount, helper: '本页已完成认证的用户' },
  { label: '策略角色', value: props.requiredRoleCount, helper: '要求完成实名的角色数量' },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
