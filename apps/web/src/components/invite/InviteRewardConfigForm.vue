<script setup lang="ts">
/**
 * 单侧邀请奖励配置表单（邀请人/被邀请人共用）：
 * 奖励方式（不发放/优惠券/钱包金额）+ 券模板选择 + 入账金额（元输入换算分）。
 */
import { computed } from 'vue';
import {
  INVITE_REWARD_TYPE_TEXT,
  InviteRewardType,
  type CouponView,
  type InviteRewardConfig,
} from '@app/contracts';

const props = defineProps<{
  /** 区块标题（如「邀请人奖励」） */
  label: string;
  /** 当前配置 */
  config: InviteRewardConfig;
  /** 可选券模板（上架中的券） */
  coupons: CouponView[];
}>();

const emit = defineEmits<{
  (e: 'update:config', value: InviteRewardConfig): void;
}>();

const REWARD_TYPES = Object.values(InviteRewardType);

const amountYuan = computed({
  get: () => props.config.amountFen / 100,
  set: (value: number) =>
    emit('update:config', {
      ...props.config,
      amountFen: Math.round((value || 0) * 100),
    }),
});

function setType(rewardType: InviteRewardType): void {
  emit('update:config', { ...props.config, rewardType });
}

function setCoupon(couponId: string): void {
  emit('update:config', { ...props.config, couponId });
}
</script>

<template>
  <div class="reward-form">
    <h3 class="reward-title">
      {{ label }}
    </h3>
    <el-form label-width="90px">
      <el-form-item label="奖励方式">
        <el-radio-group
          :model-value="config.rewardType"
          @update:model-value="setType($event as InviteRewardType)"
        >
          <el-radio-button
            v-for="type in REWARD_TYPES"
            :key="type"
            :value="type"
          >
            {{ INVITE_REWARD_TYPE_TEXT[type] }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item
        v-if="config.rewardType === InviteRewardType.Coupon"
        label="奖励券"
      >
        <el-select
          :model-value="config.couponId"
          placeholder="选择上架中的优惠券"
          style="width: 260px"
          @update:model-value="setCoupon"
        >
          <el-option
            v-for="coupon in coupons"
            :key="coupon.id"
            :label="coupon.title"
            :value="coupon.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-if="config.rewardType === InviteRewardType.Wallet"
        label="入账金额"
      >
        <el-input-number
          v-model="amountYuan"
          :min="0.01"
          :precision="2"
          :step="1"
        />
        <span class="reward-unit">元</span>
      </el-form-item>
    </el-form>
  </div>
</template>

<style scoped>
.reward-form {
  flex: 1;
  min-width: 320px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.reward-title {
  margin: 0 0 12px;
  font-size: 14px;
}

.reward-unit {
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}
</style>
