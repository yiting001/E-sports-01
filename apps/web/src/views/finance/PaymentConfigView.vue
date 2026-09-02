<script setup lang="ts">
import type { ConfigItemView } from '@app/contracts';
import { CONFIG_KEYS, ConfigGroup, ConfigValueType, PaymentGateway } from '@app/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { configApi } from '@/api/config.api';
import { useAuthStore } from '@/stores/auth.store';

/** 本页维护的支付相关配置键 */
const KEYS = {
  wechatGateway: CONFIG_KEYS.wallet.paymentWechatGateway,
  alipayGateway: CONFIG_KEYS.wallet.paymentAlipayGateway,
  payoutGateway: CONFIG_KEYS.wallet.payoutGateway,
  jqfApiBase: CONFIG_KEYS.wallet.jqfApiBase,
  jqfMchNo: CONFIG_KEYS.wallet.jqfMchNo,
  jqfAppId: CONFIG_KEYS.wallet.jqfAppId,
  jqfApiKey: CONFIG_KEYS.wallet.jqfApiKey,
} as const;

interface PaymentConfigForm {
  wechatGateway: PaymentGateway;
  alipayGateway: PaymentGateway;
  payoutGateway: PaymentGateway;
  jqfApiBase: string;
  jqfMchNo: string;
  jqfAppId: string;
  /** 敏感项不回显；留空提交表示保持原值不变 */
  jqfApiKey: string;
}

const auth = useAuthStore();
const isSuper = computed(() => auth.profile?.isSuper === true);
const loading = ref(false);
const saving = ref(false);
const loadFailed = ref(false);
const apiKeyConfigured = ref(false);
const form = reactive<PaymentConfigForm>({
  wechatGateway: PaymentGateway.Official,
  alipayGateway: PaymentGateway.Official,
  payoutGateway: PaymentGateway.Official,
  jqfApiBase: '',
  jqfMchNo: '',
  jqfAppId: '',
  jqfApiKey: '',
});

/** 任一网关开启计全付时，计全付商户配置为必填 */
const jqfEnabled = computed(
  () =>
    form.wechatGateway === PaymentGateway.Jqf ||
    form.alipayGateway === PaymentGateway.Jqf ||
    form.payoutGateway === PaymentGateway.Jqf,
);

function readGateway(item: ConfigItemView | undefined): PaymentGateway {
  return item?.value === PaymentGateway.Jqf ? PaymentGateway.Jqf : PaymentGateway.Official;
}

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  loadFailed.value = false;
  try {
    const list = await configApi.list(ConfigGroup.Wallet);
    const byKey = new Map<string, ConfigItemView>(list.map((item) => [item.key, item]));
    form.wechatGateway = readGateway(byKey.get(KEYS.wechatGateway));
    form.alipayGateway = readGateway(byKey.get(KEYS.alipayGateway));
    form.payoutGateway = readGateway(byKey.get(KEYS.payoutGateway));
    form.jqfApiBase = byKey.get(KEYS.jqfApiBase)?.value ?? '';
    form.jqfMchNo = byKey.get(KEYS.jqfMchNo)?.value ?? '';
    form.jqfAppId = byKey.get(KEYS.jqfAppId)?.value ?? '';
    form.jqfApiKey = '';
    const apiKeyItem = byKey.get(KEYS.jqfApiKey);
    apiKeyConfigured.value = apiKeyItem !== undefined && apiKeyItem.value !== '';
  } catch {
    loadFailed.value = true;
  } finally {
    loading.value = false;
  }
}

function validate(): string {
  if (!jqfEnabled.value) {
    return '';
  }
  const base = form.jqfApiBase.trim();
  if (!base.startsWith('https://')) {
    return '计全付网关地址必须以 https:// 开头';
  }
  if (!form.jqfMchNo.trim() || !form.jqfAppId.trim()) {
    return '开启计全付需填写商户号与 appId';
  }
  if (!apiKeyConfigured.value && !form.jqfApiKey.trim()) {
    return '开启计全付需填写接口私钥 apiKey';
  }
  return '';
}

async function save(): Promise<void> {
  if (!isSuper.value) {
    return;
  }
  const error = validate();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  saving.value = true;
  try {
    const items: Array<{ key: string; value: string; secret?: boolean; remark: string }> = [
      {
        key: KEYS.wechatGateway,
        value: form.wechatGateway,
        remark: '微信支付网关：official 官方直连 / jqf 计全付（开启后微信扫码与公众号支付均走计全付）',
      },
      {
        key: KEYS.alipayGateway,
        value: form.alipayGateway,
        remark: '支付宝支付网关：official 官方直连 / jqf 计全付（开启后支付宝扫码支付与退款走计全付）',
      },
      {
        key: KEYS.payoutGateway,
        value: form.payoutGateway,
        remark: '提现网关：official 官方直连 / jqf 计全付转账（开启后支付宝与微信零钱提现均走计全付）',
      },
      {
        key: KEYS.jqfApiBase,
        value: form.jqfApiBase.trim().replace(/\/+$/, ''),
        remark: '计全付网关地址（如 https://pay.example.com，末尾不带 /）',
      },
      { key: KEYS.jqfMchNo, value: form.jqfMchNo.trim(), remark: '计全付商户号 mchNo' },
      { key: KEYS.jqfAppId, value: form.jqfAppId.trim(), remark: '计全付应用 appId' },
      {
        key: KEYS.jqfApiKey,
        value: form.jqfApiKey.trim(),
        secret: true,
        remark: '计全付接口私钥 apiKey（MD5 签名密钥）',
      },
    ];
    for (const item of items) {
      await configApi.upsert({
        key: item.key,
        value: item.value,
        type: ConfigValueType.String,
        group: ConfigGroup.Wallet,
        remark: item.remark,
        secret: item.secret ?? false,
      });
    }
    if (form.jqfApiKey.trim()) {
      apiKeyConfigured.value = true;
    }
    form.jqfApiKey = '';
    ElMessage.success('支付配置已保存');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div
    v-loading="loading"
    class="payment-config"
  >
    <el-alert
      v-if="!isSuper"
      type="warning"
      :closable="false"
      title="仅平台超级管理员可修改支付配置"
      class="payment-config__alert"
    />
    <el-alert
      v-if="loadFailed"
      type="error"
      :closable="false"
      title="支付配置加载失败"
      class="payment-config__alert"
    >
      <el-button
        size="small"
        @click="load"
      >
        重试
      </el-button>
    </el-alert>

    <el-card
      shadow="never"
      class="payment-config__card"
    >
      <template #header>
        支付网关
      </template>
      <el-form
        label-width="140px"
        :disabled="!isSuper"
      >
        <el-form-item label="微信支付">
          <el-radio-group v-model="form.wechatGateway">
            <el-radio :value="PaymentGateway.Official">
              官方渠道
            </el-radio>
            <el-radio :value="PaymentGateway.Jqf">
              计全付
            </el-radio>
          </el-radio-group>
          <div class="payment-config__tip">
            开启计全付后，微信扫码与公众号（JSAPI）支付、以及对应订单的退款均改走计全付；切换前请先处理完在途待支付订单。
          </div>
        </el-form-item>
        <el-form-item label="支付宝支付">
          <el-radio-group v-model="form.alipayGateway">
            <el-radio :value="PaymentGateway.Official">
              官方渠道
            </el-radio>
            <el-radio :value="PaymentGateway.Jqf">
              计全付
            </el-radio>
          </el-radio-group>
          <div class="payment-config__tip">
            开启计全付后，支付宝扫码支付与对应订单的退款均改走计全付（ALI_QR）；已创建的待支付单仍按下单时的渠道回调与查单。
          </div>
        </el-form-item>
        <el-form-item label="用户提现">
          <el-radio-group v-model="form.payoutGateway">
            <el-radio :value="PaymentGateway.Official">
              官方渠道
            </el-radio>
            <el-radio :value="PaymentGateway.Jqf">
              计全付转账
            </el-radio>
          </el-radio-group>
          <div class="payment-config__tip">
            官方渠道仅支持支付宝转账；开启计全付后支付宝与微信零钱提现均走计全付转账，结果由转账通知与主动查单收敛。
            提现单在申请时固定执行渠道，切换不影响在途单据。
          </div>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      shadow="never"
      class="payment-config__card"
    >
      <template #header>
        计全付配置
      </template>
      <el-form
        label-width="140px"
        :disabled="!isSuper"
      >
        <el-form-item
          label="网关地址"
          :required="jqfEnabled"
        >
          <el-input
            v-model="form.jqfApiBase"
            placeholder="https://pay.example.com（末尾不带 /）"
          />
        </el-form-item>
        <el-form-item
          label="商户号 mchNo"
          :required="jqfEnabled"
        >
          <el-input
            v-model="form.jqfMchNo"
            placeholder="计全付商户号"
          />
        </el-form-item>
        <el-form-item
          label="应用 appId"
          :required="jqfEnabled"
        >
          <el-input
            v-model="form.jqfAppId"
            placeholder="计全付应用 appId"
          />
        </el-form-item>
        <el-form-item
          label="接口私钥 apiKey"
          :required="jqfEnabled && !apiKeyConfigured"
        >
          <el-input
            v-model="form.jqfApiKey"
            type="password"
            show-password
            :placeholder="apiKeyConfigured ? '已配置（不回显），留空保持原值不变' : '计全付接口私钥（MD5 签名密钥）'"
          />
        </el-form-item>
      </el-form>
    </el-card>

    <div class="payment-config__actions">
      <el-button
        type="primary"
        :loading="saving"
        :disabled="!isSuper || loading"
        @click="save"
      >
        保存配置
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.payment-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 720px;
}

.payment-config__tip {
  width: 100%;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.payment-config__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
