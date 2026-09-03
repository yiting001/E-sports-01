<script setup lang="ts">
/**
 * 提现弹层：金额（元）+ 提现方式（支付宝 / 微信零钱）+ 姓名/身份证号（报税）→ 提交提现申请（审核制）。
 * 支付宝需填写收款账号；微信零钱由服务端取当前用户绑定的微信身份，客户端不提交账号。
 * 输入金额时按阶梯税费/配置费率实时展示税费与到账金额；提交后等待财务审核。
 */
import { computed, ref } from 'vue';
import {
  ID_CARD_NO_PATTERN,
  PAYOUT_PROVIDER_TEXT,
  PayoutProvider,
  WALLET_DEFAULTS,
  WITHDRAW_PAYOUT_PROVIDERS,
  WithdrawalStatus,
  type WithdrawTaxTier,
  calcWithdrawFeeFen,
  fenToYuan,
  pickWithdrawFeeRateBp,
  yuanToFen,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';

const props = defineProps<{
  /** 可提现余额（分），前置校验避免无效请求 */
  balanceFen: number;
  /** 提现手续费率（万分比），用于实时展示手续费与到账金额 */
  feeRateBp: number;
  /** 阶梯税费配置（按金额选档；空数组回退 feeRateBp 单一费率） */
  taxTiers: WithdrawTaxTier[];
}>();
const emit = defineEmits<{ done: []; close: [] }>();

const toast = useToast();

const amountYuan = ref('');
const provider = ref<PayoutProvider>(PayoutProvider.Alipay);
const account = ref('');
const isAlipay = computed(() => provider.value === PayoutProvider.Alipay);
const accountName = ref('');
const idCardNo = ref('');
const submitting = ref(false);

/** 手续费（分），随输入金额实时计算 */
const feeFen = computed(() => {
  const amountFen = yuanToFen(amountYuan.value);
  if (!Number.isInteger(amountFen) || amountFen <= 0) {
    return 0;
  }
  const rateBp = pickWithdrawFeeRateBp(amountFen, props.taxTiers, props.feeRateBp);
  return calcWithdrawFeeFen(amountFen, rateBp);
});

/** 到账金额（分）= 提现金额 - 手续费 */
const arriveFen = computed(() => {
  const amountFen = yuanToFen(amountYuan.value);
  if (!Number.isInteger(amountFen) || amountFen <= 0) {
    return 0;
  }
  return Math.max(amountFen - feeFen.value, 0);
});

async function submit(): Promise<void> {
  const amountFen = yuanToFen(amountYuan.value);
  if (!Number.isInteger(amountFen) || amountFen < WALLET_DEFAULTS.minWithdrawFen) {
    toast.show(`提现金额至少 ${fenToYuan(WALLET_DEFAULTS.minWithdrawFen)} 元`);
    return;
  }
  if (amountFen > props.balanceFen) {
    toast.show('提现金额不能超过余额');
    return;
  }
  if (isAlipay.value && !account.value.trim()) {
    toast.show('请填写支付宝账号');
    return;
  }
  if (!accountName.value.trim()) {
    toast.show('请填写真实姓名');
    return;
  }
  if (!ID_CARD_NO_PATTERN.test(idCardNo.value.trim())) {
    toast.show('请填写正确的 18 位身份证号（报税用）');
    return;
  }
  submitting.value = true;
  try {
    const result = await walletApi.withdraw({
      amountFen,
      provider: provider.value,
      account: isAlipay.value ? account.value.trim() : undefined,
      accountName: accountName.value.trim(),
      idCardNo: idCardNo.value.trim().toUpperCase(),
    });
    if (result.status === WithdrawalStatus.Failed) {
      toast.show(result.failReason || '提现失败，请稍后重试');
      return;
    }
    toast.show(
      result.status === WithdrawalStatus.Pending
        ? '提现申请已提交，审核通过后到账'
        : '提现处理中',
    );
    emit('done');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div
    class="mask"
    @click.self="emit('close')"
  >
    <div class="dialog card">
      <h3 class="title">
        余额提现
      </h3>
      <p class="balance">
        可提现余额 ¥{{ fenToYuan(balanceFen) }}
      </p>

      <label class="field">
        <span class="label">金额（元）</span>
        <input
          v-model="amountYuan"
          class="input"
          type="number"
          inputmode="decimal"
          placeholder="请输入提现金额"
        >
      </label>
      <div class="field">
        <span class="label">提现方式</span>
        <div class="providers">
          <button
            v-for="item in WITHDRAW_PAYOUT_PROVIDERS"
            :key="item"
            type="button"
            class="provider"
            :class="{ active: provider === item }"
            @click="provider = item"
          >
            {{ PAYOUT_PROVIDER_TEXT[item] }}
          </button>
        </div>
      </div>
      <label
        v-if="isAlipay"
        class="field"
      >
        <span class="label">支付宝账号</span>
        <input
          v-model="account"
          class="input"
          type="text"
          placeholder="邮箱或手机号"
        >
      </label>
      <p
        v-else
        class="fee-tip"
      >
        将转入当前登录绑定的微信零钱，需已在微信内完成微信登录
      </p>
      <label class="field">
        <span class="label">真实姓名</span>
        <input
          v-model="accountName"
          class="input"
          type="text"
          placeholder="收款方实名"
        >
      </label>
      <label class="field">
        <span class="label">身份证号（报税用）</span>
        <input
          v-model="idCardNo"
          class="input"
          type="text"
          maxlength="18"
          placeholder="18 位身份证号"
        >
      </label>

      <p
        v-if="arriveFen > 0"
        class="fee-tip"
      >
        税费 ¥{{ fenToYuan(feeFen) }}，预计到账 ¥{{ fenToYuan(arriveFen) }}
      </p>

      <button
        class="primary"
        :disabled="submitting"
        @click="submit"
      >
        {{ submitting ? '提交中…' : '确认提现' }}
      </button>
      <button
        class="close"
        @click="emit('close')"
      >
        取消
      </button>
    </div>
  </div>
</template>

<style scoped>
.mask {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.65);
}

.dialog {
  width: min(320px, calc(100vw - 48px));
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.title {
  font-size: 16px;
  font-weight: 800;
  font-style: italic;
}

.balance {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12px;
  color: var(--c-text-secondary);
}

.input {
  height: 40px;
  padding: 0 12px;
  color: var(--c-text);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
  font-size: 14px;
}

.fee-tip {
  width: 100%;
  font-size: 12px;
  color: var(--c-text-secondary);
}

.providers {
  display: flex;
  gap: 8px;
}

.provider {
  flex: 1;
  height: 36px;
  font-size: 13px;
  color: var(--c-text-secondary);
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}

.provider.active {
  color: var(--c-accent);
  border-color: var(--c-accent);
  font-weight: 700;
}

.primary {
  width: 100%;
  padding: 10px 0;
  font-size: 14px;
  font-weight: 800;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: var(--radius-sm);
}

.primary:disabled {
  opacity: 0.6;
}

.close {
  width: 100%;
  min-height: 40px;
  padding: 10px 0;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
