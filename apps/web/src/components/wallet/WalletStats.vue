<script setup lang="ts">
import { computed } from 'vue';
import AppStats from '@/components/common/AppStats.vue';

const props = defineProps<{
  balanceYuan: string;
  statusLabel: string;
  totalRechargeYuan: string;
  rechargeCount: number;
  totalWithdrawYuan: string;
  withdrawCount: number;
  total: number;
  latestTransactionText: string;
}>();

const items = computed(() => [
  { label: '账户余额（元）', value: props.balanceYuan, helper: `${props.statusLabel}状态` },
  { label: '累计充值（元）', value: props.totalRechargeYuan, helper: `${props.rechargeCount} 笔` },
  { label: '累计提现（元）', value: props.totalWithdrawYuan, helper: `${props.withdrawCount} 笔` },
  { label: '最近流水', value: props.total, helper: props.latestTransactionText },
]);
</script>

<template>
  <app-stats :items="items" />
</template>
