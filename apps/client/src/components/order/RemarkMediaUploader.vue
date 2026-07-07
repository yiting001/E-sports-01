<script setup lang="ts">
/**
 * 备注附件上传：下单页备注区的图片/视频上传控件，
 * 选文件后调自助上传接口，v-model 同步附件列表，可删除已传项。
 */
import { ref } from 'vue';
import { ORDER_LIMITS, type RemarkMediaItem } from '@app/contracts';
import { uploadApi } from '@/api/upload.api';
import { useToast } from '@/composables/use-toast';

const items = defineModel<RemarkMediaItem[]>({ required: true });

const toast = useToast();
const fileInput = ref<HTMLInputElement | null>(null);
const uploading = ref(false);

/** 按 MIME 前缀判定附件类型；非图片/视频拒绝 */
function mediaType(file: File): RemarkMediaItem['type'] | null {
  if (file.type.startsWith('image/')) {
    return 'image';
  }
  if (file.type.startsWith('video/')) {
    return 'video';
  }
  return null;
}

async function onPick(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) {
    return;
  }
  const type = mediaType(file);
  if (!type) {
    toast.show('仅支持上传图片或视频');
    return;
  }
  uploading.value = true;
  try {
    const uploaded = await uploadApi.uploadSelf(file);
    items.value = [...items.value, { type, url: uploaded.url }];
  } finally {
    uploading.value = false;
  }
}

function remove(index: number): void {
  items.value = items.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div class="uploader">
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <div class="cell">
        <video
          v-if="item.type === 'video'"
          class="media"
          :src="item.url"
          preload="metadata"
          muted
        />
        <span
          v-else
          class="media media--image"
          :style="{ backgroundImage: `url(${item.url})` }"
        />
        <button
          class="remove"
          aria-label="删除附件"
          @click="remove(index)"
        >
          ×
        </button>
      </div>
    </template>

    <button
      v-if="items.length < ORDER_LIMITS.remarkMediaMax"
      class="cell cell--add"
      :disabled="uploading"
      @click="fileInput?.click()"
    >
      {{ uploading ? '…' : '＋' }}
    </button>
    <input
      ref="fileInput"
      type="file"
      accept="image/*,video/*"
      class="file"
      @change="onPick"
    >
  </div>
</template>

<style scoped>
.uploader {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cell {
  position: relative;
  width: 64px;
  height: 64px;
}

.media {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-sm);
  background: var(--c-cover-bg);
  object-fit: cover;
}

.media--image {
  background-size: cover;
  background-position: center;
}

.remove {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  font-size: 12px;
  color: var(--c-bg);
  background: var(--c-accent);
  border-radius: 50%;
}

.cell--add {
  display: grid;
  place-items: center;
  font-size: 20px;
  color: var(--c-text-muted);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius-sm);
}

.file {
  display: none;
}
</style>
