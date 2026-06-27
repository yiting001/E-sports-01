<script setup lang="ts">
import { Plus } from '@element-plus/icons-vue';
import { ElMessage, type UploadFile } from 'element-plus';
import { ref } from 'vue';
import { uploadApi } from '@/api/upload.api';

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const uploading = ref(false);

/** 限制为图片且不超过 5MB */
function beforeUpload(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('仅支持上传图片文件');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB');
    return false;
  }
  return true;
}

async function onChange(uploadFile: UploadFile): Promise<void> {
  const file = uploadFile.raw;
  if (!file || !beforeUpload(file)) {
    return;
  }
  uploading.value = true;
  try {
    const result = await uploadApi.upload(file);
    emit('update:modelValue', result.url);
    ElMessage.success('图片已上传');
  } finally {
    uploading.value = false;
  }
}

function clear(): void {
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="image-uploader">
    <el-upload
      :show-file-list="false"
      :auto-upload="false"
      accept="image/*"
      @change="onChange"
    >
      <div
        v-loading="uploading"
        class="image-uploader__trigger"
      >
        <img
          v-if="props.modelValue"
          :src="props.modelValue"
          class="image-uploader__preview"
          alt="预览"
        >
        <el-icon
          v-else
          class="image-uploader__icon"
        >
          <Plus />
        </el-icon>
      </div>
    </el-upload>
    <div
      v-if="props.modelValue"
      class="image-uploader__actions"
    >
      <el-input
        :model-value="props.modelValue"
        readonly
        size="small"
      />
      <el-button
        link
        type="danger"
        size="small"
        @click="clear"
      >
        清除
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.image-uploader__trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}
.image-uploader__trigger:hover {
  border-color: var(--el-color-primary);
}
.image-uploader__preview {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.image-uploader__icon {
  font-size: 28px;
  color: var(--el-text-color-placeholder);
}
.image-uploader__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
</style>
