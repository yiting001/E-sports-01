<script setup lang="ts">
import { PaymentProvider } from '@app/contracts';
import { CircleCheck } from '@element-plus/icons-vue';

export interface WalletRechargeForm {
  amountYuan: number;
  provider: PaymentProvider;
}

const props = defineProps<{
  modelValue: boolean;
  form: WalletRechargeForm;
  submitting: boolean;
  qrCode: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:form': [value: WalletRechargeForm];
  submit: [];
  paid: [];
}>();

function updateForm(patch: Partial<WalletRechargeForm>): void {
  emit('update:form', { ...props.form, ...patch });
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="账户充值"
    width="460px"
    class="wallet-dialog"
    @update:model-value="(value: boolean) => emit('update:modelValue', value)"
  >
    <template v-if="!qrCode">
      <div class="wallet-dialog__intro">
        <span>
          <el-icon><CircleCheck /></el-icon>
        </span>
        <p>充值订单生成后，请使用对应渠道扫码完成支付。</p>
      </div>
      <el-form
        label-position="top"
        class="wallet-form"
      >
        <el-form-item label="充值金额">
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
        <el-form-item label="支付方式">
          <el-radio-group
            :model-value="form.provider"
            @update:model-value="(value: PaymentProvider) => updateForm({ provider: value })"
          >
            <el-radio-button :value="PaymentProvider.Alipay">
              支付宝
            </el-radio-button>
            <el-radio-button :value="PaymentProvider.Wechat">
              微信支付
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
    </template>
    <div
      v-else
      class="qr-block"
    >
      <img
        :src="qrCode"
        alt="支付二维码"
        class="qr-image"
      >
      <p>请使用{{ form.provider === PaymentProvider.Alipay ? '支付宝' : '微信' }}扫码支付</p>
    </div>
    <template #footer>
      <el-button @click="emit('update:modelValue', false)">
        关闭
      </el-button>
      <el-button
        v-if="!qrCode"
        type="primary"
        :loading="submitting"
        @click="emit('submit')"
      >
        生成支付二维码
      </el-button>
      <el-button
        v-else
        type="primary"
        @click="emit('paid')"
      >
        我已支付
      </el-button>
    </template>
  </el-dialog>
</template>
