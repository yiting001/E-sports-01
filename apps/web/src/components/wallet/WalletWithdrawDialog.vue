<script setup lang="ts">
import { computed } from 'vue';
import { PAYOUT_PROVIDER_TEXT, PayoutProvider } from '@app/contracts';
import { CreditCard } from '@element-plus/icons-vue';

export interface WalletWithdrawForm {
  amountYuan: number;
  provider: PayoutProvider;
  /** 支付宝登录号 / 银行卡号 */
  account: string;
  accountName: string;
  /** 收款方身份证号（报税用，18 位） */
  idCardNo: string;
  /** 开户行名称（银行卡提现） */
  bankName: string;
  /** 银行预留手机号（银行卡提现且渠道要求时） */
  phone: string;
}

const props = defineProps<{
  modelValue: boolean;
  form: WalletWithdrawForm;
  submitting: boolean;
  /** 当前提现网关可选的到账方式（服务端下发） */
  methods: PayoutProvider[];
  /** 银行卡提现是否需填写预留手机号（服务端下发） */
  phoneRequired: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: WalletWithdrawForm];
  submit: [];
}>();

const isBankCard = computed(() => props.form.provider === PayoutProvider.BankCard);

function updateForm(patch: Partial<WalletWithdrawForm>): void {
  emit('update:form', { ...props.form, ...patch });
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    title="账户提现"
    size="460px"
    class="admin-drawer wallet-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <div class="wallet-dialog__intro">
      <span>
        <el-icon><CreditCard /></el-icon>
      </span>
      <p>
        {{
          isBankCard
            ? '请确认银行卡号、开户行与持卡人姓名准确无误，提交后将进入打款流程。'
            : '请确认收款账号和真实姓名准确无误，提交后将进入打款流程。'
        }}
      </p>
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
          <el-radio-button
            v-for="method in methods"
            :key="method"
            :value="method"
          >
            {{ PAYOUT_PROVIDER_TEXT[method] }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="isBankCard">
        <el-form-item label="银行卡号">
          <el-input
            :model-value="form.account"
            maxlength="30"
            placeholder="收款人本人银行卡号（对私借记卡）"
            @update:model-value="(value: string) => updateForm({ account: value })"
          />
        </el-form-item>
        <el-form-item label="开户行">
          <el-input
            :model-value="form.bankName"
            maxlength="64"
            placeholder="如：招商银行"
            @update:model-value="(value: string) => updateForm({ bankName: value })"
          />
        </el-form-item>
        <el-form-item label="持卡人姓名">
          <el-input
            :model-value="form.accountName"
            placeholder="与银行卡开户名一致"
            @update:model-value="(value: string) => updateForm({ accountName: value })"
          />
        </el-form-item>
      </template>
      <template v-else>
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
      </template>
      <el-form-item label="身份证号（报税用）">
        <el-input
          :model-value="form.idCardNo"
          maxlength="18"
          placeholder="收款人 18 位身份证号"
          @update:model-value="(value: string) => updateForm({ idCardNo: value })"
        />
      </el-form-item>
      <el-form-item
        v-if="isBankCard && phoneRequired"
        label="银行预留手机号"
      >
        <el-input
          :model-value="form.phone"
          maxlength="11"
          placeholder="银行卡预留手机号"
          @update:model-value="(value: string) => updateForm({ phone: value })"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="admin-drawer__footer">
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
      </div>
    </template>
  </el-drawer>
</template>
