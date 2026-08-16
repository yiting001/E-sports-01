<script setup lang="ts">
import { WechatPayCertUsage } from '@app/contracts';
import { ref } from 'vue';
import { ElMessage, type UploadRequestOptions } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { configApi } from '@/api/config.api';

const emit = defineEmits<{ uploaded: [] }>();

const usage = ref<WechatPayCertUsage>(WechatPayCertUsage.Merchant);
const password = ref('');
const uploading = ref(false);

const USAGE_OPTIONS = [
  { value: WechatPayCertUsage.Merchant, label: '商户证书/私钥（apiclient_key.pem / apiclient_cert.p12）' },
  { value: WechatPayCertUsage.Platform, label: '平台验签证书/公钥（回调验签）' },
];

async function doUpload(options: UploadRequestOptions): Promise<void> {
  uploading.value = true;
  try {
    const result = await configApi.uploadWechatPayCert(
      options.file,
      usage.value,
      password.value || undefined,
    );
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
  <el-card
    class="wechat-pay-cert"
    shadow="never"
  >
    <template #header>
      <span>微信支付证书上传（PEM / P12）</span>
    </template>
    <el-form label-width="84px">
      <el-form-item label="证书用途">
        <el-select
          v-model="usage"
          style="width: 100%"
        >
          <el-option
            v-for="option in USAGE_OPTIONS"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="P12 口令">
        <el-input
          v-model="password"
          type="password"
          show-password
          placeholder="仅 P12 文件需要，微信支付默认为商户号"
        />
      </el-form-item>
      <el-form-item label="证书文件">
        <el-upload
          :show-file-list="false"
          :http-request="doUpload"
          accept=".pem,.p12,.pfx,.key,.crt,.cert"
          :disabled="uploading"
        >
          <el-button
            type="primary"
            :loading="uploading"
            :icon="UploadFilled"
          >
            选择文件并上传
          </el-button>
        </el-upload>
      </el-form-item>
    </el-form>
    <p class="wechat-pay-cert__tip">
      文件仅在服务端内存中解析，私钥与公钥写入配置中心敏感项后不再回显。
    </p>
  </el-card>
</template>

<style scoped>
.wechat-pay-cert {
  margin-top: 16px;
}

.wechat-pay-cert__tip {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
