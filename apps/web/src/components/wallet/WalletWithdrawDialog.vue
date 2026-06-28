<script setup lang="ts">
import { PayoutProvider } from '@app/contracts';
import { CreditCard } from '@element-plus/icons-vue';

export interface WalletWithdrawForm {
  amountYuan: number;
  provider: PayoutProvider;
  account: string;
  accountName: string;
}

const props = defineProps<{
  modelValue: boolean;
  form: WalletWithdrawForm;
  submitting: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: WalletWithdrawForm];
  submit: [];
}>();

function updateForm(patch: Partial<WalletWithdrawForm>): void {
  emit('update:form', { ...props.form, ...patch });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="账户提现"
    width="460px"
    class="wallet-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="wallet-dialog__intro">
      <span>
        <el-icon><CreditCard /></el-icon>
      </span>
      <p>请确认收款账号和真实姓名准确无误，提交后将进入打款流程。</p>
    </div>
    <el-form
      label-position="top"
      class="wallet-form"
    >
      <el-form-item label="提现金额">
        <div class="wallet-number-field">
          <el-input-number
            :model-value="form.amountYuan"
            :min="0.01"
            :precision="2"
            :step="1"
            @update:model-value="(value: number | undefined) => updateForm({ amountYuan: value ?? 0.01 })"
          />
          <span class="form-unit">元</span>
        </div>
      </el-form-item>
      <el-form-item label="到账方式">
        <el-radio-group
          :model-value="form.provider"
          @update:model-value="(value: PayoutProvider) => updateForm({ provider: value })"
        >
          <el-radio-button :value="PayoutProvider.Alipay">
            支付宝
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="支付宝账号">
        <el-input
          :model-value="form.account"
          placeholder="收款支付宝登录号（邮箱/手机号）"
          @update:model-value="(value: string) => updateForm({ account: value })"
        />
      </el-form-item>
      <el-form-item label="真实姓名">
        <el-input
          :model-value="form.accountName"
          placeholder="收款人真实姓名"
          @update:model-value="(value: string) => updateForm({ accountName: value })"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        取消
      </el-button>
      <el-button
        type="primary"
        :loading="submitting"
        @click="emit('submit')"
      >
        确认提现
      </el-button>
    </template>
  </el-dialog>
</template>
