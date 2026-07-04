<script setup lang="ts">
/**
 * 首页横幅设置面板：上传/更换/撤下 C 端首页横幅图片。
 * 图片经上传接口拿 URL，保存后写入配置中心并即时生效。
 */
import { onMounted, ref } from 'vue';
import { PERMS } from '@app/contracts';
import { ElMessage } from 'element-plus';
import AppPanel from '@/components/common/AppPanel.vue';
import ImageUploader from '@/components/common/ImageUploader.vue';
import { noticeApi } from '@/api/notice.api';

const image = ref('');
const saved = ref('');
const saving = ref(false);
const loading = ref(true);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await noticeApi.getBanner();
    image.value = res.image;
    saved.value = res.image;
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  try {
    await noticeApi.updateBanner({ image: image.value });
    saved.value = image.value;
    ElMessage.success(image.value ? '横幅已更新' : '横幅已撤下');
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <app-panel
    title="首页横幅"
    eyebrow="Home Banner"
    description="C 端首页顶部横幅图片；未配置时展示默认样式"
  >
    <div
      v-loading="loading"
      class="banner-panel"
    >
      <image-uploader v-model="image" />
      <div class="banner-panel__actions">
        <el-button
          v-permission="PERMS.notice.banner"
          type="primary"
          :loading="saving"
          :disabled="image === saved"
          @click="save"
        >
          保存横幅
        </el-button>
        <span class="banner-panel__hint">清空图片后保存即撤下横幅</span>
      </div>
    </div>
  </app-panel>
</template>

<style scoped>
.banner-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.banner-panel__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.banner-panel__hint {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
