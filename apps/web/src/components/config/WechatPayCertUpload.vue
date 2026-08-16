<script setup lang="ts">
import { WechatPayCertUsage, type WechatPayCertUploadResult } from '@app/contracts';
import { computed, ref } from 'vue';
import { ElMessage, type UploadRequestOptions } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { configApi } from '@/api/config.api';

const props = defineProps<{ usage: WechatPayCertUsage }>();

const emit = defineEmits<{ uploaded: [] }>();

const password = ref('');
const uploading = ref(false);
/** 最近一次上传的解析结果（留在抽屉内展示，供用户确认写入了哪些配置） */
const lastResult = ref<WechatPayCertUploadResult | null>(null);

const usageTip = computed(() =>
  props.usage === WechatPayCertUsage.Merchant
    ? '商户用途：请上传 apiclient_key.pem 或 apiclient_cert.p12（P12 口令默认为商户号），解析后写入商户私钥与商户证书序列号。'
    : '平台用途：请上传微信支付平台证书或平台公钥 pub_key.pem（不是商户 apiclient 证书）。公钥文件不含序列号，需另在 platformSerialNo 填商户平台展示的 PUB_KEY_ID_… 编号。',
);

async function doUpload(options: UploadRequestOptions): Promise<void> {
  uploading.value = true;
  try {
    const result = await configApi.uploadWechatPayCert(
      options.file,
      props.usage,
      password.value || undefined,
    );
    lastResult.value = result;
    ElMessage.success(
      result.serialNo ? `证书已解析入库（序列号 ${result.serialNo}）` : '证书已解析入库',
    );
    password.value = '';
    emit('uploaded');
  } finally {
    uploading.value = false;
  }
}
</script>

<template>
  <div class="wechat-pay-cert">
    <div class="wechat-pay-cert__row">
      <el-upload
        :show-file-list="false"
        :http-request="doUpload"
        accept=".pem,.p12,.pfx,.key,.crt,.cert"
        :disabled="uploading"
      >
        <el-button
          type="primary"
          plain
          :loading="uploading"
          :icon="UploadFilled"
        >
          上传证书文件（PEM / P12）
        </el-button>
      </el-upload>
      <el-input
        v-model="password"
        class="wechat-pay-cert__password"
        type="password"
        show-password
        placeholder="P12 口令（仅 P12 需要，默认商户号）"
      />
    </div>
    <p class="wechat-pay-cert__tip">
      {{ usageTip }}
    </p>
    <p class="wechat-pay-cert__tip">
      文件仅在服务端内存中解析，私钥/公钥与证书序列号自动写入对应配置项，敏感项不再回显。
    </p>
    <el-alert
      v-if="lastResult"
      class="wechat-pay-cert__result"
      type="success"
      :closable="false"
      show-icon
    >
      <template #title>
        解析成功{{ lastResult.serialNo ? `，证书序列号 ${lastResult.serialNo}` : '' }}
      </template>
      已写入配置项：{{ lastResult.updatedKeys.join('、') }}
    </el-alert>
  </div>
</template>

<style scoped>
.wechat-pay-cert {
  width: 100%;
}

.wechat-pay-cert__row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.wechat-pay-cert__password {
  flex: 1;
  min-width: 200px;
}

.wechat-pay-cert__tip {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.wechat-pay-cert__result {
  margin-top: 8px;
}
</style>
