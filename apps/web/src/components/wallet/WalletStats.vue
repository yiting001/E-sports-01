<script setup lang="ts">
defineProps<{
  balanceYuan: string;
  statusLabel: string;
  totalRechargeYuan: string;
  rechargeCount: number;
  totalWithdrawYuan: string;
  withdrawCount: number;
  total: number;
  latestTransactionText: string;
}>();
</script>

<template>
  <section class="wallet-stats">
    <article class="wallet-stat">
      <span>账户余额（元）</span>
      <strong>{{ balanceYuan }}</strong>
      <small>{{ statusLabel }}状态</small>
    </article>
    <article class="wallet-stat">
      <span>累计充值（元）</span>
      <strong>{{ totalRechargeYuan }}</strong>
      <small>{{ rechargeCount }} 笔</small>
    </article>
    <article class="wallet-stat">
      <span>累计提现（元）</span>
      <strong>{{ totalWithdrawYuan }}</strong>
      <small>{{ withdrawCount }} 笔</small>
    </article>
    <article class="wallet-stat">
      <span>最近流水</span>
      <strong>{{ total }}</strong>
      <small>{{ latestTransactionText }}</small>
    </article>
  </section>
</template>
