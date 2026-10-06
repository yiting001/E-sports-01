<template>
  <view class="card section">
    <text class="section-title">
      支付方式
    </text>
    <view
      class="pay-row"
      :class="{ active: modelValue === OrderPaymentMethod.Balance }"
      @tap="select(OrderPaymentMethod.Balance)"
    >
      <view class="pay-info">
        <text class="pay-name">
          钱包余额
        </text>
        <text class="pay-desc">
          可用余额 ¥{{ balanceYuan }}
        </text>
      </view>
      <view
        class="pay-check"
        :class="{ checked: modelValue === OrderPaymentMethod.Balance }"
      >
        <text
          v-if="modelValue === OrderPaymentMethod.Balance"
          class="pay-check-mark"
        >
          ✓
        </text>
      </view>
    </view>
    <view
      class="pay-row"
      :class="{ active: modelValue === OrderPaymentMethod.Wechat }"
      @tap="select(OrderPaymentMethod.Wechat)"
    >
      <view class="pay-info">
        <text class="pay-name">
          微信支付
        </text>
        <text class="pay-desc">
          拉起微信收银台（需服务商支持小程序支付）
        </text>
      </view>
      <view
        class="pay-check"
        :class="{ checked: modelValue === OrderPaymentMethod.Wechat }"
      >
        <text
          v-if="modelValue === OrderPaymentMethod.Wechat"
          class="pay-check-mark"
        >
          ✓
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { OrderPaymentMethod } from '@app/contracts';

/**
 * 结算页支付方式选择。
 * 小程序内仅提供余额支付与微信支付（微信支付需服务端返回小程序签约的
 * jsapiParams，否则提交后仍为待付款，不会引导外部扫码/转账）。
 */
defineProps<{
  modelValue: OrderPaymentMethod;
  balanceYuan: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: OrderPaymentMethod];
}>();

function select(value: OrderPaymentMethod): void {
  emit('update:modelValue', value);
}
</script>

<style scoped>
.section-title {
  display: block;
  color: #9aa6bb;
  font-size: 24rpx;
  margin-bottom: 16rpx;
}

.pay-row {
  display: flex;
  align-items: center;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
  padding: 24rpx;
  margin-top: 16rpx;
}

.pay-row:first-of-type {
  margin-top: 0;
}

.pay-row.active {
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.08);
}

.pay-info {
  flex: 1;
}

.pay-name {
  display: block;
  color: #e9eef6;
  font-size: 28rpx;
  font-weight: 600;
}

.pay-desc {
  display: block;
  margin-top: 6rpx;
  color: #67738c;
  font-size: 22rpx;
}

.pay-check {
  width: 36rpx;
  height: 36rpx;
  border: 1rpx solid rgba(150, 165, 195, 0.4);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pay-check.checked {
  background-color: #ffb020;
  border-color: #ffb020;
}

.pay-check-mark {
  color: #1a1205;
  font-size: 24rpx;
  font-weight: 700;
}
</style>
