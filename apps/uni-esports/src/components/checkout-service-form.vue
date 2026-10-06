<template>
  <view class="card service-form">
    <view class="field">
      <view class="field-head">
        <text class="field-label">
          数字游戏 ID
        </text>
        <text class="field-tag field-tag-required">
          必填
        </text>
      </view>
      <input
        v-model="gameAccountId"
        class="input"
        type="number"
        :maxlength="ORDER_LIMITS.gameAccountIdMax"
        placeholder="请输入数字游戏 ID"
        placeholder-class="placeholder"
      >
    </view>

    <view class="field">
      <view class="field-head">
        <text class="field-label">
          游戏区服
        </text>
      </view>
      <view class="option-grid">
        <button
          v-for="region in regions"
          :key="region.value"
          class="option-item"
          :class="{ active: serviceRegion === region.value }"
          @tap="serviceRegion = region.value"
        >
          {{ region.label }}
        </button>
      </view>
    </view>

    <view class="field">
      <view class="field-head">
        <text class="field-label">
          文字游戏 ID
        </text>
        <text class="field-tag">
          选填
        </text>
      </view>
      <input
        v-model="gameTextId"
        class="input"
        :maxlength="ORDER_LIMITS.gameTextIdMax"
        placeholder="请输入文字游戏 ID"
        placeholder-class="placeholder"
      >
    </view>

    <view class="field">
      <view class="field-head">
        <text class="field-label">
          其他账号信息
        </text>
        <text class="field-tag">
          选填，仅接单打手可见
        </text>
      </view>
      <textarea
        v-model="accountInfo"
        class="textarea"
        :maxlength="ORDER_LIMITS.accountInfoMax"
        placeholder="需要补充的游戏账号或登录说明"
        placeholder-class="placeholder"
        auto-height
      />
    </view>

    <view class="field">
      <view class="field-head">
        <text class="field-label">
          接单打手
        </text>
      </view>
      <view class="option-grid">
        <button
          v-for="mode in modes"
          :key="mode.value"
          class="option-item"
          :class="{ active: mode.value === OrderBoosterSelectionMode.Auto }"
          @tap="selectMode(mode.value)"
        >
          {{ mode.label }}
        </button>
      </view>
      <text class="booster-policy">
        指定后仅由该打手履约，支付成功后由客服确认接单。
      </text>
    </view>

    <view class="quantity-row">
      <text class="field-label">
        下单数量
      </text>
      <view class="stepper">
        <button
          class="stepper-btn"
          :disabled="quantity <= ORDER_LIMITS.quantityMin"
          @tap="changeQuantity(-1)"
        >
          −
        </button>
        <text class="stepper-value">
          {{ quantity }}
        </text>
        <button
          class="stepper-btn"
          :disabled="quantity >= ORDER_LIMITS.quantityMax"
          @tap="changeQuantity(1)"
        >
          ＋
        </button>
      </view>
    </view>

    <view class="field">
      <view class="field-head">
        <text class="field-label">
          下单备注
        </text>
        <text class="field-tag">
          选填
        </text>
      </view>
      <textarea
        v-model="remark"
        class="textarea"
        :maxlength="ORDER_LIMITS.remarkMax"
        placeholder="开黑时间、段位或其他要求"
        placeholder-class="placeholder"
        auto-height
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  BOOSTER_SERVICE_REGIONS,
  ORDER_LIMITS,
  OrderBoosterSelectionMode,
} from '@app/contracts';
import { toast } from '@/utils/toast';

/**
 * 结算页服务表单，结构与 apps/client 的 CheckoutServiceForm 一致：
 * 数字 ID → 区服 → 文字 ID → 账号信息 → 接单打手 → 数量 → 备注。
 * 小程序端暂不提供挑选打手目录，指定打手入口引导回 H5 端。
 */
const gameAccountId = defineModel<string>('gameAccountId', { required: true });
const gameTextId = defineModel<string>('gameTextId', { required: true });
const accountInfo = defineModel<string>('accountInfo', { required: true });
const serviceRegion = defineModel<string>('serviceRegion', { required: true });
const quantity = defineModel<number>('quantity', { required: true });
const remark = defineModel<string>('remark', { required: true });

const regions = BOOSTER_SERVICE_REGIONS.map((item) => ({
  value: item.value,
  label: item.label.replace('三角洲 - ', ''),
}));

const modes = [
  { value: OrderBoosterSelectionMode.Auto, label: '自动安排' },
  { value: OrderBoosterSelectionMode.Specified, label: '指定打手' },
] as const;

function selectMode(mode: OrderBoosterSelectionMode): void {
  if (mode === OrderBoosterSelectionMode.Specified) {
    toast('小程序端暂不支持挑选打手，请在 H5 端指定');
    return;
  }
}

function changeQuantity(delta: number): void {
  const next = quantity.value + delta;
  if (next < ORDER_LIMITS.quantityMin || next > ORDER_LIMITS.quantityMax) {
    return;
  }
  quantity.value = next;
}
</script>

<style scoped>
.service-form {
  margin-bottom: 24rpx;
}

.field {
  margin-bottom: 28rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.field-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.field-label {
  color: #e9eef6;
  font-size: 26rpx;
  font-weight: 600;
}

.field-tag {
  color: #67738c;
  font-size: 22rpx;
}

.field-tag-required {
  color: #ffb020;
}

.option-grid {
  display: flex;
  gap: 16rpx;
}

.option-item {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #9aa6bb;
  border: 1rpx solid rgba(150, 165, 195, 0.24);
  border-radius: 8rpx;
}

.option-item.active {
  color: #ffb020;
  border-color: #ffb020;
  background-color: rgba(255, 176, 32, 0.1);
  font-weight: 600;
}

.booster-policy {
  display: block;
  margin-top: 12rpx;
  color: #67738c;
  font-size: 22rpx;
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28rpx;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.stepper-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(150, 165, 195, 0.3);
  border-radius: 8rpx;
  color: #e9eef6;
  font-size: 34rpx;
}

.stepper-btn[disabled] {
  color: #67738c;
}

.stepper-value {
  min-width: 72rpx;
  text-align: center;
  color: #e9eef6;
  font-size: 32rpx;
  font-weight: 600;
}
</style>
