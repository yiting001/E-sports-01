<script setup lang="ts">
/**
 * 提现弹层：金额（元）+ 支付宝收款账号/姓名 → 发起提现（支付宝转账）。
 * 成功/处理中通知父组件刷新余额；失败展示渠道返回原因。
 */
import { ref } from 'vue';
import {
  PayoutProvider,
  WALLET_DEFAULTS,
  WithdrawalStatus,
  fenToYuan,
  yuanToFen,
} from '@app/contracts';
import { walletApi } from '@/api/wallet.api';
import { useToast } from '@/composables/use-toast';

const props = defineProps<{
  /** 可提现余额（分），前置校验避免无效请求 */
  balanceFen: number;
}>();
const emit = defineEmits<{ done: []; close: [] }>();

const toast = useToast();

const amountYuan = ref('');
const account = ref('');
const accountName = ref('');
const submitting = ref(false);

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
  if (!account.value.trim() || !accountName.value.trim()) {
    toast.show('请填写支付宝账号与真实姓名');
    return;
  }
  submitting.value = true;
  try {
    const result = await walletApi.withdraw({
      amountFen,
      provider: PayoutProvider.Alipay,
      account: account.value.trim(),
      accountName: accountName.value.trim(),
    });
    if (result.status === WithdrawalStatus.Failed) {
      toast.show(result.failReason || '提现失败，请稍后重试');
      return;
    }
    toast.show(
      result.status === WithdrawalStatus.Success ? '提现成功' : '提现处理中',
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
      <label class="field">
        <span class="label">支付宝账号</span>
        <input
          v-model="account"
          class="input"
          type="text"
          placeholder="邮箱或手机号"
        >
      </label>
      <label class="field">
        <span class="label">真实姓名</span>
        <input
          v-model="accountName"
          class="input"
          type="text"
          placeholder="收款方实名"
        >
      </label>

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
  padding: 8px 22px;
  font-size: 13px;
  color: var(--c-text-secondary);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-sm);
}
</style>
