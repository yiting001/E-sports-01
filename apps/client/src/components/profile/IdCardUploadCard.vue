<script setup lang="ts">
/**
 * 证件照片上传卡：选择图片后经 /upload/self 自助上传，v-model 绑定图片 URL。
 * 已上传展示缩略图，点击可重新选择替换。
 */
import { ref } from 'vue';
import AppIcon from '@/components/common/AppIcon.vue';
import { uploadApi } from '@/api/upload.api';

defineProps<{
  /** 卡片标题，如「身份证人像面」 */
  label: string;
  /** 拍摄要求说明 */
  hint: string;
}>();

const url = defineModel<string>({ required: true });

const fileInput = ref<HTMLInputElement>();
const uploading = ref(false);

async function onFileChange(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || uploading.value) {
    return;
  }
  uploading.value = true;
  try {
    const uploaded = await uploadApi.uploadSelf(file);
    url.value = uploaded.url;
  } finally {
    uploading.value = false;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  }
}
</script>

<template>
  <div class="upload-card">
    <div class="head">
      <strong class="label">{{ label }}</strong>
      <small class="hint">{{ hint }}</small>
    </div>
    <button
      class="picker"
      type="button"
      :disabled="uploading"
      @click="fileInput?.click()"
    >
      <img
        v-if="url"
        :src="url"
        :alt="label"
        class="preview"
      >
      <span
        v-else
        class="placeholder"
      >
        <AppIcon
          name="image"
          :size="24"
        />
        <span>{{ uploading ? '上传中…' : '点击上传' }}</span>
      </span>
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      hidden
      @change="onFileChange"
    >
  </div>
</template>

<style scoped>
.upload-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.label {
  font-size: 14px;
  color: var(--c-text);
}

.hint {
  font-size: 12px;
  color: var(--c-text-muted);
}

.picker {
  width: 100%;
  aspect-ratio: 8 / 5;
  border: 1px dashed var(--c-border);
  background: var(--c-bg);
  display: grid;
  place-items: center;
  overflow: hidden;
}

.picker:disabled {
  opacity: 0.6;
}

.preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--c-text-muted);
}
</style>
