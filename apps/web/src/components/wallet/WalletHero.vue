<script setup lang="ts">
import { Download, Money, Refresh, Tickets, Upload, Wallet } from '@element-plus/icons-vue';

defineProps<{
  balanceYuan: string;
  statusLabel: string;
  statusClass: string;
}>();

const emit = defineEmits<{
  recharge: [];
  withdraw: [];
  refresh: [];
}>();
</script>

<template>
  <header class="wallet-hero">
    <div class="wallet-hero__content">
      <span class="wallet-eyebrow">Wallet Center</span>
      <h1>资金钱包</h1>
      <p>统一管理当前账号的钱包余额、充值提现和收支流水，支付渠道凭证统一接入配置中心。</p>
      <div class="wallet-hero__actions">
        <el-button
          type="primary"
          :icon="Upload"
          @click="emit('recharge')"
        >
          充值
        </el-button>
        <el-button
          :icon="Download"
          @click="emit('withdraw')"
        >
          提现
        </el-button>
        <el-button
          :icon="Refresh"
          @click="emit('refresh')"
        >
          刷新
        </el-button>
      </div>
    </div>
    <div class="wallet-hero__visual">
      <div class="wallet-balance-card">
        <span class="wallet-balance-card__label">
          <el-icon><Wallet /></el-icon>
          可用余额
        </span>
        <strong>{{ balanceYuan }}</strong>
        <small>人民币 / 元</small>
        <span
          class="wallet-status-pill"
          :class="statusClass"
        >
          {{ statusLabel }}
        </span>
      </div>
      <div class="wallet-flow">
        <span class="wallet-flow__line flow-line-a" />
        <span class="wallet-flow__line flow-line-b" />
        <span class="wallet-flow__line flow-line-c" />
        <span class="wallet-core">
          <el-icon><Money /></el-icon>
        </span>
        <span class="wallet-node wallet-node-a">
          <el-icon><Upload /></el-icon>
        </span>
        <span class="wallet-node wallet-node-b">
          <el-icon><Download /></el-icon>
        </span>
        <span class="wallet-node wallet-node-c">
          <el-icon><Tickets /></el-icon>
        </span>
      </div>
    </div>
  </header>
</template>
