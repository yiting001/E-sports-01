<script setup lang="ts">
import { ref, watch } from "vue";
import AppIcon from "@/components/common/AppIcon.vue";
import { uploadApi } from "@/api/upload.api";

withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  "uploading-change": [value: boolean];
}>();

const image = defineModel<string>({ required: true });
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const uploadError = ref("");
const previewFailed = ref(false);

watch(image, () => {
  previewFailed.value = false;
});

function setUploading(value: boolean): void {
  uploading.value = value;
  emit("uploading-change", value);
}

async function onFileChange(event: Event): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  const input = event.target;
  const file = input.files?.[0];
  input.value = "";
  if (!file || uploading.value) {
    return;
  }
  if (!file.type.startsWith("image/")) {
    uploadError.value = "仅支持上传图片文件";
    return;
  }

  uploadError.value = "";
  setUploading(true);
  try {
    const uploaded = await uploadApi.uploadSelf(file);
    image.value = uploaded.url;
  } catch {
    uploadError.value = "图片上传失败，请重新选择后再试";
  } finally {
    setUploading(false);
  }
}

function remove(): void {
  image.value = "";
  uploadError.value = "";
}
</script>

<template>
  <div class="material-uploader">
    <div
      v-if="image && !previewFailed"
      class="preview-wrap"
    >
      <button
        type="button"
        class="preview-button"
        aria-label="更换材料图片"
        :disabled="disabled || uploading"
        @click="fileInput?.click()"
      >
        <img
          :src="image"
          class="preview"
          alt="其他材料预览"
          @error="previewFailed = true"
        >
      </button>
      <button
        type="button"
        class="remove"
        aria-label="删除材料图片"
        :disabled="disabled || uploading"
        @click="remove"
      >
        <AppIcon
          name="close"
          :size="14"
        />
      </button>
    </div>

    <button
      v-else
      type="button"
      class="picker"
      :disabled="disabled || uploading"
      @click="fileInput?.click()"
    >
      <AppIcon
        name="image"
        :size="24"
      />
      <span>{{ uploading ? "上传中…" : image ? "重新上传" : "添加图片" }}</span>
    </button>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="file-input"
      @change="onFileChange"
    >

    <p
      v-if="previewFailed"
      class="error"
    >
      图片预览失败，可重新上传
    </p>
    <p
      v-else-if="uploadError"
      class="error"
    >
      {{ uploadError }}
    </p>
  </div>
</template>

<style scoped>
.material-uploader {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.picker,
.preview-wrap {
  position: relative;
  width: 104px;
  height: 104px;
}

.picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  font-size: 12px;
  color: var(--c-text-muted);
  border: 1px dashed var(--c-border);
  background: var(--c-bg);
}

.picker:disabled,
.preview-button:disabled,
.remove:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.preview-button,
.preview {
  display: block;
  width: 100%;
  height: 100%;
}

.preview-button {
  overflow: hidden;
  border: 1px solid var(--c-border);
  background: var(--c-bg);
}

.preview {
  object-fit: contain;
}

.remove {
  position: absolute;
  top: -8px;
  right: -8px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: 50%;
}

.file-input {
  display: none;
}

.error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--c-danger);
}
</style>
