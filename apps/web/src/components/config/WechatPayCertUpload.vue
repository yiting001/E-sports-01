<script setup lang="ts">
import type { WechatPayCertUsage } from '@app/contracts';
import { ref } from 'vue';
import { ElMessage, type UploadRequestOptions } from 'element-plus';
import { UploadFilled } from '@element-plus/icons-vue';
import { configApi } from '@/api/config.api';

const props = defineProps<{ usage: WechatPayCertUsage }>();

const emit = defineEmits<{ uploaded: [] }>();

const password = ref('');
const uploading = ref(false);

async function doUpload(options: UploadRequestOptions): Promise<void> {
  uploading.value = true;
  try {
    const result = await configApi.uploadWechatPayCert(
      options.file,
      props.usage,
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
      文件仅在服务端内存中解析，私钥/公钥与证书序列号自动写入对应配置项，敏感项不再回显。
    </p>
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
</style>
