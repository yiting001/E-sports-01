<script setup lang="ts">
import { PERMS } from '@app/contracts';
import { CreditCard, Money, TrendCharts } from '@element-plus/icons-vue';

const emit = defineEmits<{
  recharge: [];
  withdraw: [];
  refresh: [];
}>();
</script>

<template>
  <section class="wallet-actions-panel">
    <button
      v-permission="PERMS.wallet.recharge"
      type="button"
      class="wallet-action"
      @click="emit('recharge')"
    >
      <span class="wallet-action__icon">
        <el-icon><Money /></el-icon>
      </span>
      <strong>扫码充值</strong>
      <small>生成支付宝或微信支付二维码</small>
    </button>
    <button
      v-permission="PERMS.wallet.withdraw"
      type="button"
      class="wallet-action"
      @click="emit('withdraw')"
    >
      <span class="wallet-action__icon is-withdraw">
        <el-icon><CreditCard /></el-icon>
      </span>
      <strong>账户提现</strong>
      <small>提交支付宝到账信息并发起打款</small>
    </button>
    <button
      type="button"
      class="wallet-action"
      @click="emit('refresh')"
    >
      <span class="wallet-action__icon is-refresh">
        <el-icon><TrendCharts /></el-icon>
      </span>
      <strong>同步余额</strong>
      <small>刷新钱包、统计和当前流水分页</small>
    </button>
  </section>
</template>
